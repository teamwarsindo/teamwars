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
    const isAdmin = Boolean(cookieStore.get('admin_session')?.value);

    // 2. Verifikasi token wasit jika ada
    let verifiedDiscordId: string | null = null;
    if (token) {
      verifiedDiscordId = await verifyRefereeToken(token);
    }

    // 3. Ambil data staf dan jadwal dari KV
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
            weekName:
              (match as any).weekName ||
              (match.weekNumber ? `Week ${match.weekNumber}` : 'Week 1'),
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

    // Helper resolusi avatar Discord asli atau fallback gambar SVG
    const resolveAvatar = (item: any) => {
      if (item.avatarUrl && typeof item.avatarUrl === 'string') return item.avatarUrl;
      if (item.avatar && typeof item.avatar === 'string') {
        if (item.avatar.startsWith('http')) return item.avatar;
        return `https://cdn.discordapp.com/avatars/${item.discordId}/${item.avatar}.png`;
      }
      return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
        item.discordName || item.discordId
      )}`;
    };

    // 4. Format data Wasit
    const feePerMatch = REFEREE_PAYROLL_CONFIG.FEE_PER_MATCH * 1000;

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
      const totalEarnedAmount = historyMatches.length * feePerMatch;

      return {
        discordId: ref.discordId,
        discordName: ref.discordName,
        avatar: resolveAvatar(ref),
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalFinishedMatches: historyMatches.length,
        // Admin bisa melihat nominal honor semua wasit; publik mendapat nilai null jika bukan pemilik token
        visibleHonor: isAdmin || isCurrentVerified ? totalEarnedAmount : null,
        payroll: isCurrentVerified
          ? {
              feePerMatch,
              totalEarned: totalEarnedAmount,
              bankInfo: (ref as any).bankInfo || null,
              payrollRequests,
              claimedMatchIds: Array.from(claimedMatchIds),
              unclaimedMatchCount: historyMatches.filter(
                (id: string) => !claimedMatchIds.has(id)
              ).length,
            }
          : null,
      };
    });

    // 5. Format data Streamer
    const streamers = streamersData.map((strm) => {
      const historyMatches = (strm as any).historyMatch || [];
      const assignedMatches = strm.assignMatch || [];

      return {
        discordId: strm.discordId,
        discordName: strm.discordName,
        avatar: resolveAvatar(strm),
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalBroadcastMatches: historyMatches.length,
      };
    });

    // 6. Ekstraksi daftar pekan
    const availableWeeksSet = new Set<string>();
    schedulesData.forEach((m) => {
      const weekLabel =
        (m as any).weekName?.trim() ||
        (m.weekNumber ? `Week ${m.weekNumber}` : 'Week 1');
      availableWeeksSet.add(weekLabel);
    });

    return NextResponse.json({
      success: true,
      isAdmin,
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
