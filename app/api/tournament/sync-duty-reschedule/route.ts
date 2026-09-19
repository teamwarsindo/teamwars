import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';
import { sendOrUpdateDutyRescheduleSchedule, RescheduleDutyMatch } from '@/lib/discord/messages/duty-reschedule';

export const dynamic = 'force-dynamic';

function isDutyEmpty(val?: string | null): boolean {
  if (!val) return true;
  const clean = val.trim();
  return clean === '' || clean === '-' || clean.toLowerCase() === 'tbd';
}

async function handleDutySync(targetWeekStr?: string | null, isForce: boolean = false) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  if (schedules.length === 0) {
    return { success: false, message: 'Data twi:schedules kosong di KV.', status: 404 };
  }

  const now = new Date();
  const todayWibKey = getWibDateKey(now); // Contoh: "2026-09-20"

  // 1. Tentukan target pekan
  let targetWeekNumber: number;
  if (targetWeekStr) {
    targetWeekNumber = parseInt(targetWeekStr.replace(/\D/g, ''), 10) || 1;
  } else {
    const upcomingMatches = schedules.filter(
      (m) => m.matchDate && getWibDateKey(new Date(m.matchDate)) >= todayWibKey
    );

    if (upcomingMatches.length > 0) {
      targetWeekNumber = Number(
        upcomingMatches[0].weekNumber || getMatchWeekNumber(upcomingMatches[0].matchDate) || 1
      );
    } else {
      targetWeekNumber = 1;
    }
  }

  const weekLabel = `Week ${targetWeekNumber}`;

  // 2. Ambil match pekan ini yang BELUM LEWAT (hari ini sampai selesai week)
  // Match kemarin otomatis dieliminasi dari daftar embed
  const activeWeekMatches = schedules.filter((m) => {
    const isSameWeek = Number(m.weekNumber || getMatchWeekNumber(m.matchDate) || 1) === targetWeekNumber;
    const isNotPast = m.matchDate && getWibDateKey(new Date(m.matchDate)) >= todayWibKey;
    const isRescheduled = Boolean((m as any).isRescheduled);
    return isSameWeek && isNotPast && isRescheduled;
  });

  // 3. Pengecekan status match khusus HARI INI
  const todayMatches = schedules.filter(
    (m) =>
      m.matchDate &&
      getWibDateKey(new Date(m.matchDate)) === todayWibKey &&
      Boolean((m as any).isRescheduled)
  );
  const hasMatchToday = todayMatches.length > 0;

  let patchReferee = false;
  let patchStreamer = false;

  if (!hasMatchToday) {
    // Tidak ada jadwal hari ini -> PATCH (hapus jadwal kemarin secara diam-diam)
    patchReferee = true;
    patchStreamer = true;
  } else {
    // Ada jadwal hari ini -> cek kelengkapan
    const isRefereeFilledToday = todayMatches.every((m) => !isDutyEmpty((m as any).referee));
    const isStreamerFilledToday = todayMatches.every((m) => !isDutyEmpty((m as any).streamer));

    patchReferee = isForce ? false : isRefereeFilledToday;
    patchStreamer = isForce ? false : isStreamerFilledToday;
  }

  // 4. Susun data match lengkap beserta emoji tim
  const dutyMatches: RescheduleDutyMatch[] = await Promise.all(
    activeWeekMatches.map(async (m) => {
      const slugA = getTeamSlug(m.teamAName);
      const slugB = getTeamSlug(m.teamBName);

      const [tA, tB] = await Promise.all([
        kv.hgetall<any>(`teams:${slugA}`),
        kv.hgetall<any>(`teams:${slugB}`),
      ]);

      const eA =
        tA?.discordEmoji ||
        tA?.emoji ||
        (tA?.emojiId ? `<:${tA?.kodeTim || 'team'}:${tA?.emojiId}>` : undefined);

      const eB =
        tB?.discordEmoji ||
        tB?.emoji ||
        (tB?.emojiId ? `<:${tB?.kodeTim || 'team'}:${tB?.emojiId}>` : undefined);

      const d = new Date(m.matchDate);
      const dateStr = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      const timeStr =
        d
          .toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta',
          })
          .replace(':', '.') + ' WIB';

      return {
        matchDateIso: m.matchDate,
        dateStr,
        timeStr,
        team1Emoji: eA,
        team1Name: m.teamAName,
        team2Emoji: eB,
        team2Name: m.teamBName,
        referee: (m as any).referee || null,
        streamer: (m as any).streamer || null,
        isRescheduled: true,
      };
    })
  );

  // 5. Eksekusi pengiriman ke Discord
  await sendOrUpdateDutyRescheduleSchedule({
    weekName: weekLabel,
    matches: dutyMatches,
    patchReferee,
    patchStreamer,
  });

  return {
    success: true,
    week: weekLabel,
    todayDate: todayWibKey,
    hasMatchToday,
    remainingMatchesInWeek: activeWeekMatches.length,
    actions: {
      refereeChannel: patchReferee ? 'PATCH (Edit Tanpa Ping)' : 'RE-POST (Delete & Ping Ulang)',
      streamerChannel: patchStreamer ? 'PATCH (Edit Tanpa Ping)' : 'RE-POST (Delete & Ping Ulang)',
    },
    status: 200,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get('week');
    const forceParam = searchParams.get('force') === 'true';

    const result = await handleDutySync(weekParam, forceParam);
    return NextResponse.json(result, { status: result.status || 200 });
  } catch (error: any) {
    console.error('[SYNC DUTY RESCHEDULE ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isForce = Boolean(body.force);
    const result = await handleDutySync(body.targetWeek, isForce);
    return NextResponse.json(result, { status: result.status || 200 });
  } catch (error: any) {
    console.error('[SYNC DUTY RESCHEDULE ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
  
