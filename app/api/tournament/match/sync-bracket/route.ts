import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { advanceBracketWinner } from '@/lib/discord/commands/game/bracket';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const secret = searchParams.get('secret') || authHeader?.replace('Bearer ', '');

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetMatchId = searchParams.get('matchId');

    // 1. Ambil data jadwal dan match reports
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const allReports = (await kv.hgetall<Record<string, any>>('twi:match_reports')) || {};

    const matchesToProcess = targetMatchId
      ? schedules.filter((m) => m.id === targetMatchId)
      : schedules;

    const logs: string[] = [];

    // 2. Loop setiap match untuk mengecek siapa pemenangnya
    for (const match of matchesToProcess) {
      let reportData = allReports[match.id];
      if (typeof reportData === 'string') {
        try {
          reportData = JSON.parse(reportData);
        } catch {
          reportData = null;
        }
      }

      // Ambil skor dari report atau dari schedule
      const scoreA = reportData?.teamA?.score ?? match.scoreA ?? 0;
      const scoreB = reportData?.teamB?.score ?? match.scoreB ?? 0;
      const isFinished = (match as any).isFinished || reportData?.isFinished || scoreA >= 10 || scoreB >= 10;

      // Hanya proses match yang sudah tuntas / mencapai skor 10
      if (isFinished && (scoreA >= 10 || scoreB >= 10)) {
        const winnerName = scoreA > scoreB ? match.teamAName : match.teamBName;

        // 🔥 Eksekusi fitur advanceBracketWinner persis seperti yang di command /game
        await advanceBracketWinner(match, winnerName);

        logs.push(`[BRACKET UPDATED] Match ${match.id}: ${winnerName} (${scoreA}-${scoreB}) dimajukan ke jadwal berikutnya.`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: logs.length,
      logs: logs.length > 0 ? logs : ['Tidak ada match tuntas yang perlu dimajukan bracket-nya.'],
    });
  } catch (error: any) {
    console.error('[SYNC BRACKET ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }              
}
