import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { REFEREE_PAYROLL_CONFIG } from '@/app/tournament/_library/constants';
import { verifyRefereeToken } from '@/app/tournament/_library/referee-token';
import { discordAPI } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    // 1. Cek sesi admin
    const cookieStore = await cookies();
    const isAdmin = Boolean(cookieStore.get('admin_session')?.value);

    // 2. Verifikasi token wasit
    let verifiedDiscordId: string | null = null;
    if (token) {
      verifiedDiscordId = await verifyRefereeToken(token);
    }

    // 3. Ambil data dari Redis KV
    const [refereesData, streamersData, schedulesData] = await Promise.all([
      kv.get<any[]>('staff:referees').then((res) => res || []),
      kv.get<any[]>('staff:streamers').then((res) => res || []),
      kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
    ]);

    // 4. Sinkronisasi Avatar Discord Asli (Fetch & Simpan ke KV jika belum ada)
    let isRefereeUpdated = false;
    let isStreamerUpdated = false;

    const resolveAndSyncAvatar = async (staffList: any[], flagSetter: () => void) => {
      return Promise.all(
        staffList.map(async (item) => {
          if (item.avatarUrl && typeof item.avatarUrl === 'string') return item.avatarUrl;
          if (item.avatar && typeof item.avatar === 'string' && item.avatar.startsWith('http')) {
            return item.avatar;
          }

          // Coba fetch dari REST API Discord jika ada discordId
          if (item.discordId) {
            try {
              const userRes: any = await discordAPI(`/users/${item.discordId}`, 'GET').catch(() => null);
              if (userRes && userRes.avatar) {
                const cdnUrl = `https://cdn.discordapp.com/avatars/${item.discordId}/${userRes.avatar}.png?size=128`;
                item.avatarUrl = cdnUrl;
                flagSetter();
                return cdnUrl;
              }
            } catch {
              // Abaikan error jaringan
            }
          }

          return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
            item.discordName || item.discordId
          )}`;
        })
      );
    };

    const refereeAvatars = await resolveAndSyncAvatar(refereesData, () => {
      isRefereeUpdated = true;
    });

    const streamerAvatars = await resolveAndSyncAvatar(streamersData, () => {
      isStreamerUpdated = true;
    });

    // Simpan kembali ke KV jika ada avatar baru yang ditemukan
    if (isRefereeUpdated) await kv.set('staff:referees', refereesData);
    if (isStreamerUpdated) await kv.set('staff:streamers', streamersData);

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
            streamPlatform: (match as any).streamPlatform || null,
          };
        })
        .filter(Boolean);
    };

    // 5. Format Data Wasit
    const feePerMatch = REFEREE_PAYROLL_CONFIG.FEE_PER_MATCH * 1000;

    const referees = refereesData.map((ref, idx) => {
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
        avatar: refereeAvatars[idx],
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

    // 6. Format Data Streamer
    const streamers = streamersData.map((strm, idx) => {
      const historyMatches = (strm as any).historyMatch || [];
      const assignedMatches = strm.assignMatch || [];

      return {
        discordId: strm.discordId,
        discordName: strm.discordName,
        avatar: streamerAvatars[idx],
        activeMatches: mapMatchDetails(assignedMatches),
        historyMatches: mapMatchDetails(historyMatches),
        totalBroadcastMatches: historyMatches.length,
      };
    });

    // 7. Batas Pekan Aktif
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

    // 8. Jadwal tuntas turnamen untuk acuan filter tim dan hari dinamis di frontend
    const finishedSchedules = schedulesData
      .filter((m) => m.isFinished || (m.scoreA ?? 0) > 0 || (m.scoreB ?? 0) > 0)
      .map((m) => ({
        id: m.id,
        weekNumber: m.weekNumber || 1,
        matchDate: m.matchDate || null,
        teamAName: m.teamAName || '',
        teamBName: m.teamBName || '',
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
        hasStream: Boolean(m.streamLink || (m as any).streamUrl || m.streamer),
      }));

    return NextResponse.json({
      success: true,
      isAdmin,
      currentVerifiedId: verifiedDiscordId,
      availableWeeks: availableWeeksList,
      referees,
      streamers,
      finishedSchedules,
    });
  } catch (error: any) {
    console.error('[STAFF ROSTER ROUTE ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat data staf.' },
      { status: 500 }
    );
  }
          }
