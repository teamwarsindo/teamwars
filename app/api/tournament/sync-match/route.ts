import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { sendOrUpdateStreamerSummaryEmbed } from '@/lib/discord/messages/streamer';

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateRandomToken(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, weekName } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan di Redis' }, { status: 404 });
    }

    const match = schedules[matchIndex];

    if (!match.refereeToken) {
      match.refereeToken = generateRandomToken(16);
    }

    // 1. Ambil Data Tim A & Tim B dari Upstash KV Redis
    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamAName)}`),
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamBName)}`),
    ]);

    const roleAId = teamA?.discordRoleId;
    const roleBId = teamB?.discordRoleId;
    const kodeTimA = teamA?.kodeTim;
    const kodeTimB = teamB?.kodeTim;

    // 2. PROSES SYNC CHANNEL MATCH & EMBED OPENING
    const syncResult = await createMatchDiscordChannel({
      matchId: match.id,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      kodeTimA,
      kodeTimB,
      weekName: weekName || `Week ${(match as any).calculatedWeekNumber || 1}`,
      matchDateIso: match.matchDate,
      refereeName: match.referee,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: match.streamer,
      streamerDiscordId: (match as any).caster || match.streamer,
      streamLink: match.streamLink,
      roleAId,
      roleBId,
      savedChannelId: (match as any).discordChannelId,
      openingMsgId: (match as any).openingMsgId,
    });

    if (syncResult.channelId) {
      (match as any).discordChannelId = syncResult.channelId;
      if (syncResult.openingMsgId) (match as any).openingMsgId = syncResult.openingMsgId;
      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);
    }

    // 3. UPDATE / PATCH REKAP EMBED DI CHANNEL STREAMER
    const allMatchesInWeek = schedules.map((m) => ({
      matchId: m.id,
      groupName: m.groupName,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      matchChannelId: (m as any).discordChannelId,
      matchDateIso: m.matchDate,
      refereeName: m.referee,
      refereeDiscordId: m.refereeDiscordId,
      streamerName: m.streamer,
      streamerDiscordId: (m as any).caster,
      streamLink: m.streamLink,
    }));

    const existingStreamerMsgIds = (await kv.get<Record<string, string>>('twi:streamer_msg_ids')) || {};

    const updatedStreamerMsgIds = await sendOrUpdateStreamerSummaryEmbed({
      weekName: weekName || `Week ${(match as any).calculatedWeekNumber || 1}`,
      matches: allMatchesInWeek,
      existingMsgIds: existingStreamerMsgIds,
    });

    await kv.set('twi:streamer_msg_ids', updatedStreamerMsgIds);

    return NextResponse.json({
      success: true,
      matchId: match.id,
      channelId: syncResult.channelId,
    });
  } catch (error) {
    console.error('Error Sync Single Match:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
      }
