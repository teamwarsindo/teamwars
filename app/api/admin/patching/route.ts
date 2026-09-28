import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, TOURNAMENT_RULES } from '@/app/tournament/_library';
import {
  getPlayoffCoordinationMessagePayload,
  PlayoffCoordinationMatchItem,
} from '@/lib/discord/messages/playoff-coordination';
import { getTeamSlug, getMatchWeekNumber, getTournamentWeekNumberSafe } from '@/lib/discord/match-sync/helpers';
import { discordAPI } from '@/lib/discord/utils';

const KV_PLAYOFF_COORD_KEY = 'twi:playoff_coordination_channel';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('msgId') || searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Parameter msgId wajib disertakan di URL (contoh: ?msgId=xxxx)' },
        { status: 400 }
      );
    }

    // 1. Ambil channel ID koordinasi dari Redis KV
    const channelId = await kv.get<string>(KV_PLAYOFF_COORD_KEY);
    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID koordinasi playoff tidak ditemukan di Redis KV' },
        { status: 404 }
      );
    }

    // 2. Ambil jadwal dari Redis KV
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    const playInsWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK;
    const quarterWeek = playInsWeek + 1;

    // Filter jadwal khusus Playoff yang aktif (Quarter Finals / Play-Ins)
    const playoffMatches = schedules.filter((m: any) => {
      const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
      if (computedWeek === quarterWeek || computedWeek === playInsWeek) return true;

      const mWeekName = String(m.weekName || '').toLowerCase();
      const mStage = String(m.stage || '').toLowerCase();
      return (
        mWeekName.includes('quarter') ||
        mWeekName.includes('play-in') ||
        mStage.includes('quarter') ||
        mStage.includes('play-in')
      );
    });

    if (playoffMatches.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ditemukan data match Playoff di twi:schedules' },
        { status: 404 }
      );
    }

    // 3. Kumpulkan match & ambil data emoji tim langsung dari Redis KV
    const matchesPayload: PlayoffCoordinationMatchItem[] = [];

    for (const match of playoffMatches) {
      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);

      const [teamA, teamB] = await Promise.all([
        kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
        kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
      ]);

      matchesPayload.push({
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        kodeTimA: teamA?.kodeTim,
        kodeTimB: teamB?.kodeTim,
        emojiAId: teamA?.emojiId,
        emojiBId: teamB?.emojiId,
      });
    }

    // Tentukan stage title berdasarkan pekan yang ditemukan
    const sampleWeek =
      playoffMatches[0]?.weekNumber ||
      getMatchWeekNumber(playoffMatches[0]?.matchDate) ||
      getTournamentWeekNumberSafe();
    const stageTitle = sampleWeek === playInsWeek ? 'Play-Ins' : 'Quarter Finals';

    // 4. Susun payload pesan menggunakan helper pesan yang sudah ada
    const payload = getPlayoffCoordinationMessagePayload({
      stageTitle,
      matches: matchesPayload,
    });

    // 5. Eksekusi PATCH ke Discord API untuk memperbarui pesan
    const patchRes = await discordAPI(
      `/channels/${channelId}/messages/${messageId}`,
      'PATCH',
      payload
    );

    return NextResponse.json({
      success: true,
      message: `Pesan Discord ${messageId} di channel ${channelId} berhasil di-patch!`,
      discordResponse: patchRes,
    });
  } catch (error: any) {
    console.error('Error patching playoff coordination message:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
