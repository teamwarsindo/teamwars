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
            groupName: match.groupName || (match as any).stage || '',
            teamAName: match.teamAName,
            teamBName: match.teamBName,
            teamALogo: match.teamALogo || (match as any).logoA || null,
            teamBLogo: match.teamBLogo || (match as any).logoB || null,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            isFinished: Boolean(match.isFinished),
            streamLink: (match as any).streamLink || (match as any).streamUrl || null,
          };
        })
        .filter(Boolean);
    };

    // Helper resolusi avatar Discord asli atau default Discord embed avatar
    const resolveAvatar = (item: any) => {
      if (item.avatarUrl && typeof item.avatarUrl === 'string') return item.avatarUrl;
      if (item.avatar && typeof item.avatar === 'string') {
        if (item.avatar.startsWith('http')) return item.avatar;
        return `https://cdn.discordapp.com/avatars/${item.discordId}/${item.avatar}.png?size=128`;
      }
      if (item.discordId && /^\d+$/.test(item.discordId)) {
        try {
          const defaultAvatarIndex = Number((BigInt(item.discordId) >> 22n) % 6n);
          return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        } catch {
          // Fallback jika BigInt gagal
        }
      }
      return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
        item.discordName || item.discordId
      )}`;
    };

    // 4. Format data Referee
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

    // 6. Ekstraksi daftar pekan hanya dari match yang aktif/tuntas (maksimal pekan berjalan)
    let maxWeekNumber = 1;
    schedulesData.forEach((m) => {
      const wNum = Number(m.weekNumber || 1);
      if ((m.isFinished || (m.scoreA ?? 0) > 0 || (m.scoreB ?? 0) > 0) && wNum > maxWeekNumber) {
        maxWeekNumber = wNum;
      }
    });

    const availableWeeksList: string[] = [];
    for (let w = 1; w <= maxWeekNumber; w++) {
      availableWeeksList.push(`Week ${w}`);
    }

    return NextResponse.json({
      success: true,
      isAdmin,
      currentVerifiedId: verifiedDiscordId,
      availableWeeks: availableWeeksList,
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
