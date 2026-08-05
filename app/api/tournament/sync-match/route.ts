import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { sendOrUpdateScheduleEmbed } from '@/lib/discord/messages/schedule';
import { sendOrUpdateStreamerSummaryEmbed } from '@/lib/discord/messages/streamer';

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

    // 2. CREATE / SYNC CHANNEL MATCH & OPENING EMBED (DI CHANNEL PRIVAT MATCH)
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

    // 3. 🟢 UPDATE EMBED SUMMARY DI CHANNEL STREAMER (#ch-streamer)
    const streamerMsgMap = (await kv.hgetall<Record<string, string>>('twi:streamer_msg_ids')) || {};

    const updatedStreamerMsgIds = await sendOrUpdateStreamerSummaryEmbed({
      weekName: calculatedWeek,
      matches: [
        {
          matchId: match.id,
          groupName: match.groupName,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          kodeTimA,
          kodeTimB,
          emojiAId,
          emojiBId,
          matchChannelId: (match as any).discordChannelId,
          matchDateIso: match.matchDate,
          refereeName: match.referee,
          refereeDiscordId: match.refereeDiscordId,
          streamerName: match.streamer || match.caster,
          streamerDiscordId: match.streamerDiscordId || match.casterDiscordId,
          streamLink: match.streamLink,
        },
      ],
      existingMsgIds: streamerMsgMap,
    });

    // Simpan kembali pembaruan ID pesan streamer ke Redis Hash 'twi:streamer_msg_ids'
    await kv.hset('twi:streamer_msg_ids', updatedStreamerMsgIds);

    // 4. UPDATE SCHEDULE EMBED DI CHANNEL PUBLIK (#schedule)
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

    if (scheduleMsgId) {
      (match as any).scheduleMsgId = scheduleMsgId;
    }

    // 5. SIMPAN DATA UPDATED MATCH KE KV REDIS
    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Match ${match.id} & Streamer Summary berhasil di-sync!`,
      channelId: (match as any).discordChannelId,
    });
  } catch (error) {
    console.error('Error Syncing Discord Channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
