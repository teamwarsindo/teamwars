import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { sendOrUpdateScheduleEmbed } from '@/lib/discord/messages/schedule';
import { sendOrUpdateRefereeAssignmentLog, sendOrUpdateStreamerAssignmentLog } from '@/lib/discord/messages/assignment-log';

interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Helper untuk memperbarui riwayat match staf di Redis KV
async function updateStaffAssignHistory(
  kvKey: 'staff:referees' | 'staff:streamers',
  staffDiscordId?: string,
  staffName?: string,
  matchId?: string
) {
  if (!staffDiscordId || !matchId) return;

  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const index = staffList.findIndex((s) => s.discordId === staffDiscordId);

  if (index !== -1) {
    const currentStaff = staffList[index];
    const history = currentStaff.assignMatch || [];
    if (!history.includes(matchId)) {
      history.push(matchId);
    }
    staffList[index] = { ...currentStaff, assignMatch: history };
  } else {
    // Fallback jika staf belum ada di KV, tambahkan baru
    staffList.push({
      discordId: staffDiscordId,
      discordName: staffName || 'Staff',
      assignMatch: [matchId],
    });
  }

  await kv.set(kvKey, staffList);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan di Redis' }, { status: 404 });
    }

    const match = schedules[matchIndex];

    // 1. CARI DATA TIM
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

    // 2. CREATE / SYNC CHANNEL MATCH & OPENING EMBED
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

    // 3. UPDATE SCHEDULE EMBED (#schedule)
    const scheduleMsgId = await sendOrUpdateScheduleEmbed({
      groupName: match.groupName,
      weekName: calculatedWeek,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      kodeTimA,
      kodeTimB,
      emojiAId,
      emojiBId,
      matchDateIso: match.matchDate,
      existingMsgId: (match as any).scheduleMsgId,
    });
    if (scheduleMsgId) (match as any).scheduleMsgId = scheduleMsgId;

    // 4. 📢 LOG PENUGASAN REFEREE & STREAMER (#CH_ASSIGN)
    const chAssign = DISCORD_CONFIG.CH_ASSIGN;
    if (chAssign) {
      const currentStreamerId = match.streamerDiscordId || match.casterDiscordId;

      // Check perubahan Referee / Tanggal
      const refChanged = (match as any).lastRefereeDiscordId !== match.refereeDiscordId;
      const dateChanged = (match as any).lastMatchDateIso !== match.matchDate;

      if (match.refereeDiscordId && (refChanged || dateChanged || !(match as any).refereeLogMsgId)) {
        const newRefLogId = await sendOrUpdateRefereeAssignmentLog({
          channelId: chAssign,
          matchId: match.id,
          weekName: calculatedWeek,
          groupName: match.groupName,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          teamAEmoji: emojiAId && kodeTimA ? `<:${kodeTimA}:${emojiAId}>` : '',
          teamBEmoji: emojiBId && kodeTimB ? `<:${kodeTimB}:${emojiBId}>` : '',
          matchChannelId: (match as any).discordChannelId,
          matchDateIso: match.matchDate,
          staffName: match.referee,
          staffDiscordId: match.refereeDiscordId,
          existingMsgId: (match as any).refereeLogMsgId,
        });

        if (newRefLogId) {
          (match as any).refereeLogMsgId = newRefLogId;
          (match as any).lastRefereeDiscordId = match.refereeDiscordId;
        }
      }

      // Check perubahan Streamer / Tanggal
      const strChanged = (match as any).lastStreamerDiscordId !== currentStreamerId;

      if (currentStreamerId && (strChanged || dateChanged || !(match as any).streamerLogMsgId)) {
        const newStrLogId = await sendOrUpdateStreamerAssignmentLog({
          channelId: chAssign,
          matchId: match.id,
          weekName: calculatedWeek,
          groupName: match.groupName,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          teamAEmoji: emojiAId && kodeTimA ? `<:${kodeTimA}:${emojiAId}>` : '',
          teamBEmoji: emojiBId && kodeTimB ? `<:${kodeTimB}:${emojiBId}>` : '',
          matchChannelId: (match as any).discordChannelId,
          matchDateIso: match.matchDate,
          staffName: match.streamer || match.caster,
          staffDiscordId: currentStreamerId,
          existingMsgId: (match as any).streamerLogMsgId,
        });

        if (newStrLogId) {
          (match as any).streamerLogMsgId = newStrLogId;
          (match as any).lastStreamerDiscordId = currentStreamerId;
        }
      }

      (match as any).lastMatchDateIso = match.matchDate;
    }

    // 5. 📊 REKAPAN: CATAT MATCH ID KE ASSIGN HISTORY STAF
    if (match.refereeDiscordId) {
      await updateStaffAssignHistory('staff:referees', match.refereeDiscordId, match.referee, match.id);
    }
    const streamerId = match.streamerDiscordId || match.casterDiscordId;
    if (streamerId) {
      await updateStaffAssignHistory('staff:streamers', streamerId, match.streamer || match.caster, match.id);
    }

    // 6. SIMPAN DATA MATHER KE REDIS
    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Match ${match.id} berhasil di-sync dan rekapan staf diperbarui!`,
      channelId: (match as any).discordChannelId,
    });
  } catch (error) {
    console.error('Error Syncing Discord Channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
