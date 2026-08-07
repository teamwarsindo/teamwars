import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { sendAssignmentLog, sendReassignReplyNote, completeAssignmentLog } from '@/lib/discord/messages/assignment-log';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { createMatchDiscordChannel } from '@/lib/discord/channels';

interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string | null;
  historyMatch?: Array<{
    matchId: string;
    matchName: string;
    completedAt: string;
    role: 'REFEREE' | 'STREAMER';
  }>;
}

// ----------------------------------------------------------------------
// HELPER INTERNAL (Direct Execution Tanpa HTTP Fetch)
// ----------------------------------------------------------------------
async function updateStaffLockAndHistory(
  kvKey: 'staff:referees' | 'staff:streamers',
  staffDiscordId: string,
  newActiveMatchId: string | null,
  completedMatch?: { matchId: string; matchName: string; role: 'REFEREE' | 'STREAMER' }
) {
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const index = staffList.findIndex((s) => s.discordId === staffDiscordId);

  if (index !== -1) {
    const staff = { ...staffList[index] };
    staff.assignMatch = newActiveMatchId;

    if (completedMatch) {
      const history = staff.historyMatch || [];
      history.push({
        ...completedMatch,
        completedAt: new Date().toISOString(),
      });
      staff.historyMatch = history;
    }

    staffList[index] = staff;
    await kv.set(kvKey, staffList);
  }
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function internalSyncMatch(params: { matchId: string; removeStaffId?: string; removeRoleType?: string }) {
  const { matchId, removeStaffId, removeRoleType } = params;
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const matchIndex = schedules.findIndex((m) => m.id === matchId);

  if (matchIndex === -1) return null;

  const match = schedules[matchIndex];
  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);

  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
    kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
  ]);

  const kodeTimA = teamA?.kodeTim || teamA?.abbreviation || '';
  const kodeTimB = teamB?.kodeTim || teamB?.abbreviation || '';
  const emojiAId = teamA?.discordEmojiId || teamA?.emojiId || '';
  const emojiBId = teamB?.discordEmojiId || teamB?.emojiId || '';
  const roleAId = teamA?.discordRoleId || teamA?.roleId || '';
  const roleBId = teamB?.discordRoleId || teamB?.roleId || '';

  const calculatedWeek = (match as any).weekName || `Week ${(match as any).calculatedWeekNumber || 1}`;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  if (removeStaffId && guildId) {
    if (removeRoleType === 'REFEREE') {
      if (roleAId) await discordAPI(`/guilds/${guildId}/members/${removeStaffId}/roles/${roleAId}`, 'DELETE').catch(() => null);
      if (roleBId) await discordAPI(`/guilds/${guildId}/members/${removeStaffId}/roles/${roleBId}`, 'DELETE').catch(() => null);
    } else if (removeRoleType === 'STREAMER' && (match as any).discordChannelId) {
      await discordAPI(`/channels/${(match as any).discordChannelId}/permissions/${removeStaffId}`, 'DELETE').catch(() => null);
    }
  }

  const syncResult = await createMatchDiscordChannel({
    matchId: match.id,
    groupName: match.groupName,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    kodeTimA,
    kodeTimB,
    emojiAId,
    emojiBId,
    weekName: calculatedWeek,
    roleAId,
    roleBId,
    refereeName: match.referee,
    refereeDiscordId: match.refereeDiscordId,
    streamerName: match.streamer || match.caster,
    streamerDiscordId: match.streamerDiscordId || match.casterDiscordId,
    streamLink: match.streamLink,
    matchDateIso: match.matchDate,
    savedChannelId: (match as any).discordChannelId,
    openingMsgId: (match as any).openingMsgId,
  });

  if (syncResult.channelId) (match as any).discordChannelId = syncResult.channelId;
  if (syncResult.openingMsgId) (match as any).openingMsgId = syncResult.openingMsgId;

  if (match.refereeDiscordId && guildId) {
    if (roleAId) await discordAPI(`/guilds/${guildId}/members/${match.refereeDiscordId}/roles/${roleAId}`, 'PUT').catch(() => null);
    if (roleBId) await discordAPI(`/guilds/${guildId}/members/${match.refereeDiscordId}/roles/${roleBId}`, 'PUT').catch(() => null);
  }

  const streamerId = match.streamerDiscordId || (match as any).casterDiscordId;
  if (streamerId && (match as any).discordChannelId) {
    await discordAPI(`/channels/${(match as any).discordChannelId}/permissions/${streamerId}`, 'PUT', {
      allow: '3072',
      deny: '0',
      type: 1,
    }).catch(() => null);
  }

  schedules[matchIndex] = match;
  await kv.set('twi:schedules', schedules);
  return match;
}

// ----------------------------------------------------------------------
// EXPORT MAIN HANDLER
// ----------------------------------------------------------------------
export async function handleStaffCommand(interaction: any) {
  try {
    const options = interaction.data?.options || [];
    const action = options.find((o: any) => o.name === 'action')?.value;
    const type = options.find((o: any) => o.name === 'type')?.value;
    const userId = options.find((o: any) => o.name === 'user')?.value;
    const matchId = options.find((o: any) => o.name === 'match')?.value;

    // 🔄 1. ACTION: UPDATE (Sync Master Staf KV) - Dengan Pagination Loop ALL Members
    if (action === 'update') {
      const guildId = DISCORD_CONFIG.GUILD_ID;
      if (!guildId) {
        return { type: 4, data: { content: '❌ Error: GUILD_ID belum dikonfigurasi!', flags: 64 } };
      }

      // 📥 FETCH ALL MEMBERS WITH PAGINATION (Melompati limit 1000 Discord)
      const allMembers: any[] = [];
      let lastMemberId = '0';
      let keepFetching = true;

      while (keepFetching) {
        const batch: any = await discordAPI(
          `/guilds/${guildId}/members?limit=1000&after=${lastMemberId}`,
          'GET'
        );

        if (Array.isArray(batch) && batch.length > 0) {
          allMembers.push(...batch);
          lastMemberId = batch[batch.length - 1].user.id;
          
          if (batch.length < 1000) {
            keepFetching = false;
          }
        } else {
          keepFetching = false;
        }
      }

      if (allMembers.length === 0) {
        return { type: 4, data: { content: '❌ Gagal mengambil daftar member Discord!', flags: 64 } };
      }

      let updatedReferees = 0;
      let updatedStreamers = 0;

      // ⚖️ SYNC REFEREE
      if (type === 'REFEREE' || type === 'BOTH' || !type) {
        const currentRefs = (await kv.get<StaffItem[]>('staff:referees')) || [];
        const newRefList: StaffItem[] = [];
        for (const m of allMembers) {
          if (m.roles?.includes(DISCORD_CONFIG.ROLE_REFEREE)) {
            const discordId = m.user.id;
            const discordName = m.nick || m.user.global_name || m.user.username;
            const existing = currentRefs.find((s) => s.discordId === discordId);
            newRefList.push({
              discordId,
              discordName,
              assignMatch: existing?.assignMatch || null,
              historyMatch: existing?.historyMatch || [],
            });
          }
        }
        await kv.set('staff:referees', newRefList);
        updatedReferees = newRefList.length;
      }

      // 🎥 SYNC STREAMER
      if (type === 'STREAMER' || type === 'BOTH' || !type) {
        const currentStrs = (await kv.get<StaffItem[]>('staff:streamers')) || [];
        const newStrList: StaffItem[] = [];
        for (const m of allMembers) {
          if (m.roles?.includes(DISCORD_CONFIG.ROLE_STREAMER)) {
            const discordId = m.user.id;
            const discordName = m.nick || m.user.global_name || m.user.username;
            const existing = currentStrs.find((s) => s.discordId === discordId);
            newStrList.push({
              discordId,
              discordName,
              assignMatch: existing?.assignMatch || null,
              historyMatch: existing?.historyMatch || [],
            });
          }
        }
        await kv.set('staff:streamers', newStrList);
        updatedStreamers = newStrList.length;
      }

      return {
        type: 4,
        data: {
          content: `✅ Master list staf berhasil diperbarui dari total **${allMembers.length}** member! (${updatedReferees} Referee, ${updatedStreamers} Streamer)`,
          flags: 64,
        },
      };
    }

    // Validation
    if (!matchId || !action) {
      return { type: 4, data: { content: '❌ Error: matchId dan action wajib diisi!', flags: 64 } };
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return { type: 4, data: { content: `❌ Error: Match ${matchId} tidak ditemukan!`, flags: 64 } };
    }

    let match = { ...schedules[matchIndex] };
    const matchName = `${match.teamAName} vs ${match.teamBName}`;
    let oldUserId: string | undefined;

    // 🟢 2. ACTION: ASSIGN
    if (action === 'assign') {
      if (!type || !userId) {
        return { type: 4, data: { content: '❌ Error: type dan user wajib diisi untuk assign!', flags: 64 } };
      }

      if (type === 'REFEREE') {
        match.refereeDiscordId = userId;
        await updateStaffLockAndHistory('staff:referees', userId, match.id);
      } else if (type === 'STREAMER') {
        match.streamerDiscordId = userId;
        await updateStaffLockAndHistory('staff:streamers', userId, match.id);
      }

      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);
    }

    // 🔄 3. ACTION: REASSIGN
    else if (action === 'reassign') {
      if (!type || !userId) {
        return { type: 4, data: { content: '❌ Error: type dan user baru wajib diisi untuk reassign!', flags: 64 } };
      }

      if (type === 'REFEREE') {
        oldUserId = match.refereeDiscordId;
        if (oldUserId) await updateStaffLockAndHistory('staff:referees', oldUserId, null);
        match.refereeDiscordId = userId;
        await updateStaffLockAndHistory('staff:referees', userId, match.id);
      } else if (type === 'STREAMER') {
        oldUserId = match.streamerDiscordId;
        if (oldUserId) await updateStaffLockAndHistory('staff:streamers', oldUserId, null);
        match.streamerDiscordId = userId;
        await updateStaffLockAndHistory('staff:streamers', userId, match.id);
      }

      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);
    }

    // ✅ 4. ACTION: COMPLETE
    else if (action === 'complete') {
      if ((type === 'REFEREE' || type === 'BOTH') && match.refereeDiscordId) {
        await updateStaffLockAndHistory('staff:referees', match.refereeDiscordId, null, {
          matchId: match.id,
          matchName,
          role: 'REFEREE',
        });
      }

      if ((type === 'STREAMER' || type === 'BOTH') && (match.streamerDiscordId || (match as any).casterDiscordId)) {
        const strId = match.streamerDiscordId || (match as any).casterDiscordId;
        await updateStaffLockAndHistory('staff:streamers', strId, null, {
          matchId: match.id,
          matchName,
          role: 'STREAMER',
        });
      }

      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);
    }

    const roleType = type === 'STREAMER' ? 'STREAMER' : 'REFEREE';

    // Sync Channel & Role Discord
    await internalSyncMatch({
      matchId: match.id,
      removeStaffId: oldUserId,
      removeRoleType: roleType,
    });

    // Logging & Reply
    if (action === 'assign') {
      const logId = await sendAssignmentLog({ match, staffDiscordId: userId, roleType });
      if (logId) {
        const currentSchedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
        const idx = currentSchedules.findIndex((m) => m.id === match.id);
        if (idx !== -1) {
          if (roleType === 'REFEREE') (currentSchedules[idx] as any).refereeLogMsgId = logId;
          else (currentSchedules[idx] as any).streamerLogMsgId = logId;
          await kv.set('twi:schedules', currentSchedules);
        }
      }
    } else if (action === 'reassign') {
      const targetLogMsgId = roleType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;
      if (targetLogMsgId && oldUserId) {
        await sendReassignReplyNote({ targetLogMsgId, oldStaffDiscordId: oldUserId, roleType });
      }

      const newLogId = await sendAssignmentLog({ match, staffDiscordId: userId, roleType });
      if (newLogId) {
        const currentSchedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
        const idx = currentSchedules.findIndex((m) => m.id === match.id);
        if (idx !== -1) {
          if (roleType === 'REFEREE') (currentSchedules[idx] as any).refereeLogMsgId = newLogId;
          else (currentSchedules[idx] as any).streamerLogMsgId = newLogId;
          await kv.set('twi:schedules', currentSchedules);
        }
      }
    } else if (action === 'complete') {
      const targetLogMsgId = roleType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;
      const staffId = roleType === 'REFEREE' ? match.refereeDiscordId : (match.streamerDiscordId || (match as any).casterDiscordId);

      if (targetLogMsgId && staffId) {
        await completeAssignmentLog({ match, targetLogMsgId, staffDiscordId: staffId, roleType });
      }
    }

    return {
      type: 4,
      data: {
        content: `🎉 Aksi **/staff ${action}** berhasil diproses untuk Match **${match.id}**!`,
        flags: 64,
      },
    };
  } catch (error) {
    console.error('Error handleStaffCommand:', error);
    return {
      type: 4,
      data: { content: `❌ Internal Error: ${String(error)}`, flags: 64 },
    };
  }
}
