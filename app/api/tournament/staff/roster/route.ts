import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

    // 1. Cek sesi admin dari cookie
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get('admin_session')?.value;
    const isAdmin = Boolean(adminCookie);

    // 2. Verifikasi token wasit
    let verifiedDiscordId: string | null = null;
    if (token) {
      verifiedDiscordId = await verifyRefereeToken(token);
    }

    // 3. Ambil data staf dan jadwal pertandingan
    const [refereesData, streamersData, schedulesData] = await Promise.all([
      kv.get<StaffItem[]>('staff:referees').then((res) => res || []),
      kv.get<StaffItem[]>('staff:streamers').then((res) => res || []),
      kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
    ]);

    const scheduleMap = new Map<string, MatchScheduleItem>();
    schedulesData.forEach((match) => {
      scheduleMap.set(match.id, match);
    });

    const mapMatchDetails = (matchIds: string[]) => {
      return (matchIds || [])
        .map((mId) => {
          const match = scheduleMap.get(mId);
          if (!match) return null;
          return {
            id: match.id,
            matchDate: match.matchDate,
            weekNumber: match.weekNumber,
            weekName: (match as any).weekName || (match.weekNumber ? `Week ${match.weekNumber}` : 'Week 1'),
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

    // Helper Avatar Gambar Nyata (Discord CDN jika ada avatar hash, fallback ke DiceBear Avatar)
    const resolveAvatarUrl = (item: any) => {
      if (item.avatar && item.discordId) {
        return `https://cdn.discordapp.com/avatars/${item.discordId}/${item.avatar}.png?size=128`;
      }
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.discordName || item.discordId)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    };

    const feePerMatchVal = REFEREE_PAYROLL_CONFIG.FEE_PER_MATCH * 1000;

    // 4. Format Data Wasit
    const referees = refereesData.map((ref) => {
      const historyMatches = (ref as any).historyMatch || [];
      const assignedMatches = ref.assignMatch || [];
      const payrollRequests: any[] = (ref as any).payrollRequests || [];

      const claimedMatchIds = new Set<string>();
      payrollRequests.forEach((pr) => {
        if (pr.status === 'PENDING' || pr.status === 'APPROVED') {
          pr.matchIds?.forEach((mId: string) => claimedMatchIds.add(mId));
        }
      });

      const isCurrentVerified = verifiedDiscordId === ref.discordId;
      const totalMatches = historyMatches.length;
      const rawEarned = totalMatches * feePerMatchVal;

      return {
        discordId: ref.discordId,
        discordName: ref.discordName,
        avatar: resolveAvatarUrl(ref),
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalFinishedMatches: totalMatches,
        // Honor terbuka jika admin login atau wasit terverifikasi
        totalHonorFormatted: isAdmin || isCurrentVerified
          ? `Rp ${rawEarned.toLocaleString('id-ID')}`
          : totalMatches === 0 ? 'Rp 0' : 'Rp ***',
        payroll: isCurrentVerified
          ? {
              feePerMatch: feePerMatchVal,
              totalEarned: rawEarned,
              bankInfo: (ref as any).bankInfo || null,
              payrollRequests: payrollRequests,
              claimedMatchIds: Array.from(claimedMatchIds),
              unclaimedMatchCount: historyMatches.filter((id: string) => !claimedMatchIds.has(id)).length,
            }
          : null,
      };
    });

    // 5. Format Data Streamer
    const streamers = streamersData.map((strm) => {
      const historyMatches = (strm as any).historyMatch || [];
      const assignedMatches = strm.assignMatch || [];

      return {
        discordId: strm.discordId,
        discordName: strm.discordName,
        avatar: resolveAvatarUrl(strm),
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalBroadcastMatches: historyMatches.length,
      };
    });

    return NextResponse.json({
      success: true,
      currentVerifiedId: verifiedDiscordId,
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
