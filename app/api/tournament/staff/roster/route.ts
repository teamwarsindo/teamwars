import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { REFEREE_PAYROLL_CONFIG } from '@/app/tournament/_library/constants';
import { verifyRefereeToken } from '@/app/tournament/_library/referee-token';
import { StaffItem } from '@/lib/discord/commands/assign/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    // 1. Verifikasi token jika disediakan
    let verifiedDiscordId: string | null = null;
    if (token) {
      verifiedDiscordId = await verifyRefereeToken(token);
    }

    // 2. Ambil master data staf dan jadwal pertandingan dari KV
    const [refereesData, streamersData, schedulesData] = await Promise.all([
      kv.get<StaffItem[]>('staff:referees').then((res) => res || []),
      kv.get<StaffItem[]>('staff:streamers').then((res) => res || []),
      kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
    ]);

    // Buat map pencarian cepat untuk detail pertandingan
    const scheduleMap = new Map<string, MatchScheduleItem>();
    schedulesData.forEach((match) => {
      scheduleMap.set(match.id, match);
    });

    // Helper pemetaan detail match
    const mapMatchDetails = (matchIds: string[]) => {
      return (matchIds || [])
        .map((mId) => {
          const match = scheduleMap.get(mId);
          if (!match) return null;
          return {
            id: match.id,
            matchDate: match.matchDate,
            weekNumber: match.weekNumber,
            weekName: match.weekName || `Week ${match.weekNumber || 1}`,
            teamAName: match.teamAName,
            teamBName: match.teamBName,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            isFinished: match.isFinished,
            streamLink: (match as any).streamLink || (match as any).streamUrl || null,
          };
        })
        .filter(Boolean);
    };

    // 3. Format data Wasit (Referee)
    const referees = refereesData.map((ref) => {
      const historyMatches = (ref as any).historyMatch || [];
      const assignedMatches = ref.assignMatch || [];
      const payrollRequests: any[] = (ref as any).payrollRequests || [];

      // Identifikasi match yang sedang diajukan (PENDING) atau sudah disetujui (APPROVED)
      const claimedMatchIds = new Set<string>();
      payrollRequests.forEach((pr) => {
        if (pr.status === 'PENDING' || pr.status === 'APPROVED') {
          pr.matchIds?.forEach((mId: string) => claimedMatchIds.add(mId));
        }
      });

      const isCurrentVerified = verifiedDiscordId === ref.discordId;

      return {
        discordId: ref.discordId,
        discordName: ref.discordName,
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalFinishedMatches: historyMatches.length,
        // Kolom khusus privat (hanya tampil jika token terverifikasi cocok dengan discordId)
        payroll: isCurrentVerified
          ? {
              feePerMatch: REFEREE_PAYROLL_CONFIG.FEE_PER_MATCH * 1000,
              totalEarned: historyMatches.length * REFEREE_PAYROLL_CONFIG.FEE_PER_MATCH * 1000,
              bankInfo: (ref as any).bankInfo || null,
              payrollRequests: payrollRequests,
              claimedMatchIds: Array.from(claimedMatchIds),
              unclaimedMatchCount: historyMatches.filter((id: string) => !claimedMatchIds.has(id)).length,
            }
          : null,
      };
    });

    // 4. Format data Streamer
    const streamers = streamersData.map((strm) => {
      const historyMatches = (strm as any).historyMatch || [];
      const assignedMatches = strm.assignMatch || [];

      return {
        discordId: strm.discordId,
        discordName: strm.discordName,
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalBroadcastMatches: historyMatches.length,
      };
    });

    // 5. Ekstraksi opsi Pekan/Week untuk filter UI
    const availableWeeksSet = new Set<string>();
    schedulesData.forEach((m) => {
      const weekLabel = m.weekName?.trim() || (m.weekNumber ? `Week ${m.weekNumber}` : 'Week 1');
      availableWeeksSet.add(weekLabel);
    });

    return NextResponse.json({
      success: true,
      currentVerifiedId: verifiedDiscordId,
      availableWeeks: Array.from(availableWeeksSet),
      referees,
      streamers,
    });
  } catch (error: any) {
    console.error('[STAFF ROSTER ROUTE ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat data staf.' },
      { status: 500 }
    );
  }
}
