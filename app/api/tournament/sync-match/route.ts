import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { sendOrUpdateScheduleEmbed } from '@/lib/discord/messages/schedule';
import { sendOrUpdateWeeklyRecapEmbed } from '@/lib/discord/messages/weekly-recap';

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

    // 1. Ambil Data Tim & Custom Emojis
    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamAName)}`),
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamBName)}`),
    ]);

    const kodeTimA = teamA?.kodeTim || teamA?.abbreviation || '';
    const kodeTimB = teamB?.kodeTim || teamB?.abbreviation || '';
    const emojiAId = teamA?.discordEmojiId || '';
    const emojiBId = teamB?.discordEmojiId || '';
    const roleAId = teamA?.discordRoleId || '';
    const roleBId = teamB?.discordRoleId || '';

    const calculatedWeek = match.weekName || `Week ${(match as any).calculatedWeekNumber || 1}`;

    // 2. CREATE / SYNC DISCORD MATCH CHANNEL & OPENING EMBED UNTUK MATCH INI
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
      streamerName: match.caster || match.streamer,
      streamerDiscordId: match.streamerDiscordId || match.casterDiscordId,
      streamLink: match.streamLink,
      matchDateIso: match.matchDate,
      savedChannelId: (match as any).discordChannelId,
      openingMsgId: (match as any).openingMsgId,
    });

    if (syncResult.channelId) {
      (match as any).discordChannelId = syncResult.channelId;
    }
    if (syncResult.openingMsgId) {
      (match as any).openingMsgId = syncResult.openingMsgId;
    }

    // 3. HITUNG JUMLAH MATCH PER HARI DI WEEK YANG SAMA
    const weekMatches = schedules.filter((m) => {
      const mWeek = m.weekName || `Week ${(m as any).calculatedWeekNumber || 1}`;
      return mWeek === calculatedWeek;
    });

    const dateMap: Record<string, { dateFormatted: string; count: number }> = {};

    weekMatches.forEach((m) => {
      if (!m.matchDate) return;
      const d = new Date(m.matchDate);
      const keyIso = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      const dateFormatted = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });

      if (!dateMap[keyIso]) {
        dateMap[keyIso] = { dateFormatted, count: 0 };
      }
      dateMap[keyIso].count += 1;
    });

    const dailyMatchCounts = Object.keys(dateMap)
      .sort()
      .map((k) => dateMap[k]);

    // 4. 📢 BROADCAST WEEKLY RECAP KE SEMUA CHANNEL MATCH PADA WEEK INI
    for (const m of schedules) {
      const mWeek = m.weekName || `Week ${(m as any).calculatedWeekNumber || 1}`;
      
      // Jika match ada di week yang sama DAN channel Discord-nya sudah ada
      if (mWeek === calculatedWeek && (m as any).discordChannelId) {
        const newRecapMsgId = await sendOrUpdateWeeklyRecapEmbed({
          channelId: (m as any).discordChannelId,
          weekName: calculatedWeek,
          dailyMatchCounts,
          existingRecapMsgId: (m as any).recapMsgId,
        });

        if (newRecapMsgId) {
          (m as any).recapMsgId = newRecapMsgId;
        }
      }
    }

    // 5. SEND / UPDATE SCHEDULE EMBED DI CHANNEL JADWAL PUBLIK
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

    // 6. SIMPAN SEMUA UPDATE ID KE KV REDIS
    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Match ${match.id} berhasil di-sync dan Weekly Recap disebarkan ke seluruh channel ${calculatedWeek}!`,
      channelId: (match as any).discordChannelId,
      openingMsgId: (match as any).openingMsgId,
      recapMsgId: (match as any).recapMsgId,
      scheduleMsgId: (match as any).scheduleMsgId,
    });
  } catch (error) {
    console.error('Error Syncing Discord Channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}