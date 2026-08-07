import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { sendOrUpdateRefereeAssignmentLog, sendOrUpdateStreamerAssignmentLog } from '@/lib/discord/messages/assignment-log';
import { discordAPI } from '@/lib/discord/utils';

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

// Helper untuk menghapus matchId dari riwayat staf KV agar status lock terlepas
async function removeStaffAssignHistory(
  kvKey: 'staff:referees' | 'staff:streamers',
  staffDiscordId?: string,
  matchId?: string
) {
  if (!staffDiscordId || !matchId) return;

  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const index = staffList.findIndex((s) => s.discordId === staffDiscordId);

  if (index !== -1) {
    const currentStaff = staffList[index];
    const history = (currentStaff.assignMatch || []).filter((id) => id !== matchId);
    staffList[index] = { ...currentStaff, assignMatch: history };
    await kv.set(kvKey, staffList);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, action, unassignType, removedStaffId, reason } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan di Redis' }, { status: 404 });
    }

    const match = schedules[matchIndex];

    // 1. CARI DATA TIM & ROLE DISCORD
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

    // =========================================================================
    // 🔴 A. KHUSUS UNASSIGN: CABUT AKSES DISCORD & LEPAS LOCK STAF (DATA REDIS MATCH TETAP ADA)
    // =========================================================================
    if (action === 'UNASSIGN' && removedStaffId) {
      // 1. Cabut Role Tim Wasit / Permission Streamer dari Server Discord
      if (unassignType === 'REFEREE' && guildId) {
        if (roleAId) await discordAPI(`/guilds/${guildId}/members/${removedStaffId}/roles/${roleAId}`, 'DELETE').catch(() => null);
        if (roleBId) await discordAPI(`/guilds/${guildId}/members/${removedStaffId}/roles/${roleBId}`, 'DELETE').catch(() => null);
        await removeStaffAssignHistory('staff:referees', removedStaffId, match.id);
      }

      if (unassignType === 'STREAMER' && (match as any).discordChannelId) {
        await discordAPI(`/channels/${(match as any).discordChannelId}/permissions/${removedStaffId}`, 'DELETE').catch(() => null);
        await removeStaffAssignHistory('staff:streamers', removedStaffId, match.id);
      }

      // 2. Patch Embed Log di #CH_ASSIGN
      const chAssign = DISCORD_CONFIG.CH_ASSIGN;
      const targetLogMsgId = unassignType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;

      if (chAssign && targetLogMsgId) {
        const nowUnix = Math.floor(Date.now() / 1000);
        const reasonText = reason === 'COMPLETED' ? '✅ MATCH SELESAI' : '⛔ PENUGASAN DICABUT / GANTI STAFF';

        const existingMsg = await discordAPI(`/channels/${chAssign}/messages/${targetLogMsgId}`, 'GET').catch(() => null);
        if (existingMsg && existingMsg.embeds && existingMsg.embeds[0]) {
          const oldEmbed = existingMsg.embeds[0];
          const updatedEmbed = {
            ...oldEmbed,
            title: `~~${oldEmbed.title}~~ [${reasonText}]`,
            color: reason === 'COMPLETED' ? 0x10b981 : 0x6b7280,
            footer: { text: `Team Wars Indonesia • Status Log Updated (<t:${nowUnix}:R>)` },
          };

          await discordAPI(`/channels/${chAssign}/messages/${targetLogMsgId}`, 'PATCH', {
            content: `~~<@${removedStaffId}> ditugaskan sebagai **${unassignType}**!~~ (${reasonText})`,
            embeds: [updatedEmbed],
          }).catch(() => null);
        }
      }
    }

    // =========================================================================
    // 🟢 B. RE-RENDER OPENING EMBED CHANNEL MATCH
    // =========================================================================
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

    // SIMPAN DATA SCHEDULE KE REDIS (Field referee & streamer tetap aman!)
    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Sync Match ${match.id} berhasil diproses!`,
      channelId: (match as any).discordChannelId,
    });
  } catch (error) {
    console.error('Error Syncing Match:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
          }
