import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';
import { sendOrUpdateDutyRescheduleSchedule, RescheduleDutyMatch } from '@/lib/discord/messages/duty-reschedule';

export const dynamic = 'force-dynamic';

async function handleDutySync(targetWeekStr?: string | null, isForce: boolean = false) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  if (schedules.length === 0) {
    return { success: false, message: 'Data twi:schedules kosong di KV.', status: 404 };
  }

  const now = new Date();
  const todayWibKey = getWibDateKey(now); // Contoh: "2026-09-15"

  // 1. Pengecekan apakah hari ini ada match (bisa di-bypass dengan ?force=true)
  const hasMatchToday = schedules.some(
    (m) => m.matchDate && getWibDateKey(new Date(m.matchDate)) === todayWibKey
  );

  if (!hasMatchToday && !isForce) {
    return {
      success: true,
      skipped: true,
      message: `Tidak ada jadwal pertandingan hari ini (${todayWibKey}). Eksekusi dilewati. Gunakan '?force=true' untuk tetap menjalankan.`,
      status: 200,
    };
  }

  // 2. Tentukan target week (jika tidak ada parameter, otomatis deteksi pekan aktif)
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

  // 3. Ambil seluruh match pada week tersebut
  const weekMatches = schedules.filter(
    (m) => Number(m.weekNumber || getMatchWeekNumber(m.matchDate) || 1) === targetWeekNumber
  );

  if (weekMatches.length === 0) {
    return {
      success: false,
      message: `Tidak ditemukan match untuk ${weekLabel}.`,
      status: 200,
    };
  }

  // 4. Susun data match lengkap dengan emoji tim
  const dutyMatches: RescheduleDutyMatch[] = await Promise.all(
    weekMatches.map(async (m) => {
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
        referee: (m as any).referee,
        streamer: (m as any).streamer,
        isRescheduled: (m as any).isRescheduled,
      };
    })
  );

  // 5. Eksekusi sync ke CH_REFEREE & CH_STREAMER
  await sendOrUpdateDutyRescheduleSchedule({
    weekName: weekLabel,
    matches: dutyMatches,
  });

  const rescheduledMatches = dutyMatches.filter((m) => Boolean(m.isRescheduled));
  const emptyReferee = rescheduledMatches.filter(
    (m) => !m.referee || m.referee.trim() === '' || m.referee === '-'
  ).length;
  const emptyStreamer = rescheduledMatches.filter(
    (m) => !m.streamer || m.streamer.trim() === '' || m.streamer === '-'
  ).length;

  return {
    success: true,
    skipped: false,
    forced: isForce && !hasMatchToday,
    message: `Sinkronisasi duty reschedule untuk ${weekLabel} berhasil dijalankan!`,
    week: weekLabel,
    todayDate: todayWibKey,
    hasMatchToday,
    totalMatchInWeek: weekMatches.length,
    totalRescheduled: rescheduledMatches.length,
    butuhWasit: emptyReferee,
    butuhStreamer: emptyStreamer,
    status: 200,
  };
}

// 🌐 Method GET: Akses URL browser / Cron
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get('week');
    const forceParam = searchParams.get('force') === 'true';

    const result = await handleDutySync(weekParam, forceParam);
    return NextResponse.json(result, { status: result.status || 200 });
  } catch (error: any) {
    console.error('[SYNC DUTY RESCHEDULE GET ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🌐 Method POST: Webhook / Fetch API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isForce = Boolean(body.force);
    const result = await handleDutySync(body.targetWeek, isForce);
    return NextResponse.json(result, { status: result.status || 200 });
  } catch (error: any) {
    console.error('[SYNC DUTY RESCHEDULE POST ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
