import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { getTeamSlug, getMatchWeekNumber } from '@/lib/discord/match-sync/helpers';

interface AuditMatchEntry {
  matchId: string;
  teams: string;
  missingFields: string[];
  refillSuccess: boolean;
  changesApplied: Record<string, any>;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetMatchId = searchParams.get('matchId');

    // 1. Ambil data schedules dan seluruh reports dari KV
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const allReports = (await kv.hgetall<Record<string, any>>('twi:match_reports')) || {};

    const filteredSchedules = targetMatchId
      ? schedules.filter((s) => s.id === targetMatchId)
      : schedules;

    if (filteredSchedules.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data match yang cocok untuk diproses.' },
        { status: 404 }
      );
    }

    const auditLog: AuditMatchEntry[] = [];
    const reportsToUpdate: Record<string, any> = {};

    for (const schedule of filteredSchedules) {
      const matchId = schedule.id;
      const existingReport = allReports[matchId] || null;

      const scheduleDateStr = schedule.matchDate ? schedule.matchDate.split('T')[0] : '';
      const scheduleStreamer = schedule.streamer || '';
      const scheduleReferee = schedule.referee || '';
      const scheduleStreamUrl = schedule.streamLink || (schedule as any).streamUrl || '';
      const scheduleStreamPlatform = (schedule as any).streamPlatform || 'YouTube';

      const missingFields: string[] = [];
      const changes: Record<string, any> = {};

      let reportData: any;

      if (!existingReport) {
        missingFields.push('report_document_missing');
        const computedWeek = schedule.weekNumber || getMatchWeekNumber(schedule.matchDate);

        reportData = {
          matchId,
          week: computedWeek,
          metadata: {
            date: scheduleDateStr,
            streamPlatform: scheduleStreamPlatform,
            streamer: scheduleStreamer,
            referee: scheduleReferee,
            streamUrl: scheduleStreamUrl,
          },
          teamA: {
            name: schedule.teamAName,
            slug: getTeamSlug(schedule.teamAName),
            score: schedule.scoreA ?? 0,
            repeatsUsed: 0,
            warningsUsed: 0,
            lineup: [],
          },
          teamB: {
            name: schedule.teamBName,
            slug: getTeamSlug(schedule.teamBName),
            score: schedule.scoreB ?? 0,
            repeatsUsed: 0,
            warningsUsed: 0,
            lineup: [],
          },
          games: [],
          finalScore: {
            teamA: schedule.scoreA ?? 0,
            teamB: schedule.scoreB ?? 0,
          },
          winnerTeam: null,
          isFinished: false,
        };

        changes['document_created'] = true;
      } else {
        // Clone dokumen report agar mutasi aman
        reportData = JSON.parse(JSON.stringify(existingReport));

        if (!reportData.metadata) {
          reportData.metadata = {};
          missingFields.push('metadata_object');
        }

        // Cek metadata date
        if (!reportData.metadata.date && scheduleDateStr) {
          missingFields.push('metadata.date');
          reportData.metadata.date = scheduleDateStr;
          changes['metadata.date'] = scheduleDateStr;
        }

        // Cek metadata streamer
        if (!reportData.metadata.streamer && scheduleStreamer) {
          missingFields.push('metadata.streamer');
          reportData.metadata.streamer = scheduleStreamer;
          changes['metadata.streamer'] = scheduleStreamer;
        }

        // Cek metadata referee
        if (!reportData.metadata.referee && scheduleReferee) {
          missingFields.push('metadata.referee');
          reportData.metadata.referee = scheduleReferee;
          changes['metadata.referee'] = scheduleReferee;
        }

        // Cek metadata streamUrl
        if (!reportData.metadata.streamUrl && scheduleStreamUrl) {
          missingFields.push('metadata.streamUrl');
          reportData.metadata.streamUrl = scheduleStreamUrl;
          changes['metadata.streamUrl'] = scheduleStreamUrl;
        }

        // Cek metadata streamPlatform
        if (!reportData.metadata.streamPlatform) {
          missingFields.push('metadata.streamPlatform');
          reportData.metadata.streamPlatform = scheduleStreamPlatform;
          changes['metadata.streamPlatform'] = scheduleStreamPlatform;
        }
      }

      // Cek dan sinkronkan pemenang jika salah satu tim telah mencapai skor 10
      const scoreA = reportData.finalScore?.teamA ?? reportData.teamA?.score ?? schedule.scoreA ?? 0;
      const scoreB = reportData.finalScore?.teamB ?? reportData.teamB?.score ?? schedule.scoreB ?? 0;

      let determinedWinner: string | null = null;
      if (scoreA >= 10) {
        determinedWinner = reportData.teamA?.name || schedule.teamAName;
      } else if (scoreB >= 10) {
        determinedWinner = reportData.teamB?.name || schedule.teamBName;
      }

      if (determinedWinner) {
        if (!reportData.winnerTeam) {
          missingFields.push('winnerTeam');
          reportData.winnerTeam = determinedWinner;
          changes['winnerTeam'] = determinedWinner;
        }
        if (!reportData.isFinished) {
          missingFields.push('isFinished');
          reportData.isFinished = true;
          changes['isFinished'] = true;
        }
      }

      // Jika ditemukan field yang bolong, daftarkan untuk di-update
      if (missingFields.length > 0) {
        reportsToUpdate[matchId] = reportData;
        auditLog.push({
          matchId,
          teams: `${schedule.teamAName} vs ${schedule.teamBName}`,
          missingFields,
          refillSuccess: false, // Ditandai sementara sebelum hset sukses
          changesApplied: changes,
        });
      }
    }

    // 2. Eksekusi batch refill ke Redis Hash jika ada data yang perlu diperbaiki
    if (Object.keys(reportsToUpdate).length > 0) {
      await kv.hset('twi:match_reports', reportsToUpdate);

      // Perbarui status kesuksesan refill pada audit log
      for (const entry of auditLog) {
        entry.refillSuccess = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Proses audit dan refill match reports selesai dieksekusi.',
      summary: {
        totalMatchesChecked: filteredSchedules.length,
        totalMatchesWithMissingData: auditLog.length,
        totalRefilled: Object.keys(reportsToUpdate).length,
      },
      auditLog,
    });
  } catch (error: any) {
    console.error('Error in refill-match-reports:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
