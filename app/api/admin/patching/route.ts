import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, TOURNAMENT_RULES } from '@/app/tournament/_library';
import {
  getPlayoffCoordinationMessagePayload,
  PlayoffCoordinationMatchItem,
} from '@/lib/discord/messages/playoff-coordination';
import {
  getTeamSlug,
  getMatchWeekNumber,
  getTournamentWeekNumberSafe,
} from '@/lib/discord/match-sync/helpers';
import { discordAPI } from '@/lib/discord/utils';

const KV_PLAYOFF_COORD_KEY = 'twi:playoff_coordination_channel';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('msgId') || searchParams.get('messageId');
    const targetWeek = searchParams.get('week') || searchParams.get('targetWeek') || '9';

    if (!messageId) {
      return NextResponse.json(
        { error: 'Parameter msgId wajib disertakan di URL (contoh: ?msgId=xxxx&week=9)' },
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

    // 3. Ekstraksi pekan & filtering (adopsi 100% logika handleSyncWeekAction)
    const weekMatch = String(targetWeek).match(/\d+/);
    const weekNumber = weekMatch ? parseInt(weekMatch[0], 10) : getTournamentWeekNumberSafe();
    const normTarget = String(targetWeek).toLowerCase().replace(/[^a-z0-9]/g, '');

    const weekMatches = schedules.filter((m: any) => {
      const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
      if (computedWeek === weekNumber) return true;

      const mWeekName = String(m.weekName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const mStage = String(m.stage || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (mWeekName && mWeekName.includes(normTarget)) || (mStage && mStage.includes(normTarget));
    });

    if (weekMatches.length === 0) {
      return NextResponse.json(
        { error: `Tidak ada jadwal pertandingan untuk ${targetWeek}` },
        { status: 404 }
      );
    }

    // 4. Kumpulkan match & ambil data emoji tim langsung dari Redis KV
    const matchesPayload: PlayoffCoordinationMatchItem[] = [];

    for (const match of weekMatches) {
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

    // 5. Tentukan stage title persis seperti alur route sync
    const playInsWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK;
    const isPlayIns = weekNumber === playInsWeek;
    const stageTitle = isPlayIns ? 'Play-Ins' : 'Quarter Finals';

    // 6. Susun payload pesan
    const payload = getPlayoffCoordinationMessagePayload({
      stageTitle,
      matches: matchesPayload,
    });

    // 7. Eksekusi PATCH ke Discord API untuk memperbarui pesan
    const patchRes = await discordAPI(
      `/channels/${channelId}/messages/${messageId}`,
      'PATCH',
      payload
    );

    return NextResponse.json({
      success: true,
      message: `Pesan Discord ${messageId} berhasil di-patch untuk babak ${stageTitle}!`,
      discordResponse: patchRes,
    });
  } catch (error: any) {
    console.error('Error patching playoff coordination message:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}