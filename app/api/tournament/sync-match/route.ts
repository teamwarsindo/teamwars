import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { discordAPI } from '@/lib/discord/utils';

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, removeStaffId, removeRoleType } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
    }

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

    // 🔴 1. JIKA ADA STAF YANG DICABUT ROLE/PERMISSION-NYA (Misal saat Reassign/Complete)
    if (removeStaffId && guildId) {
      if (removeRoleType === 'REFEREE') {
        if (roleAId) await discordAPI(`/guilds/${guildId}/members/${removeStaffId}/roles/${roleAId}`, 'DELETE').catch(() => null);
        if (roleBId) await discordAPI(`/guilds/${guildId}/members/${removeStaffId}/roles/${roleBId}`, 'DELETE').catch(() => null);
      } else if (removeRoleType === 'STREAMER' && (match as any).discordChannelId) {
        await discordAPI(`/channels/${(match as any).discordChannelId}/permissions/${removeStaffId}`, 'DELETE').catch(() => null);
      }
    }

    // 🟢 2. RE-RENDER OPENING EMBED & PASANG PERMISSION
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

    // 🟢 3. BERIKAN ROLE / PERMISSION UNTUK STAF AKTIF
    if (match.refereeDiscordId && guildId) {
      if (roleAId) await discordAPI(`/guilds/${guildId}/members/${match.refereeDiscordId}/roles/${roleAId}`, 'PUT').catch(() => null);
      if (roleBId) await discordAPI(`/guilds/${guildId}/members/${match.refereeDiscordId}/roles/${roleBId}`, 'PUT').catch(() => null);
    }

    const streamerId = match.streamerDiscordId || (match as any).casterDiscordId;
    if (streamerId && (match as any).discordChannelId) {
      await discordAPI(`/channels/${(match as any).discordChannelId}/permissions/${streamerId}`, 'PUT', {
        allow: '3072', // View Channel & Send Messages
        deny: '0',
        type: 1,
      }).catch(() => null);
    }

    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Sync Match ${match.id} berhasil!`,
      channelId: (match as any).discordChannelId,
    });
  } catch (error) {
    console.error('Error Sync Match:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}