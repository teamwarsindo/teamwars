import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';
import { sendOrUpdateDutyRescheduleSchedule, RescheduleDutyMatch } from '@/lib/discord/messages/duty-reschedule';

// Fungsi utama sinkronisasi
async function handleDutySync(targetWeekStr?: string | null) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  if (schedules.length === 0) {
    return { success: false, message: 'Data twi:schedules kosong di KV.', status: 404 };
  }

  // 1. Tentukan target week (jika tidak ada parameter, otomatis deteksi pekan aktif)
  let targetWeekNumber: number;
  if (targetWeekStr) {
    targetWeekNumber = parseInt(targetWeekStr.replace(/\D/g, ''), 10) || 1;
  } else {
    const now = new Date();
    const todayWibKey = getWibDateKey(now);
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

  // 2. Ambil semua match pada week tersebut
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

  // 3. Susun data match lengkap dengan emoji tim
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

  // 4. Eksekusi sync ke CH_REFEREE & CH_STREAMER
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
    message: `Sinkronisasi duty reschedule untuk ${weekLabel} berhasil dijalankan!`,
    week: weekLabel,
    totalMatchInWeek: weekMatches.length,
    totalRescheduled: rescheduledMatches.length,
    butuhWasit: emptyReferee,
    butuhStreamer: emptyStreamer,
    status: 200,
  };
}

// 🌐 Method GET: Untuk diakses langsung lewat address bar browser
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get('week'); // contoh: ?week=7

    const result = await handleDutySync(weekParam);
    return NextResponse.json(result, { status: result.status || 200 });
  } catch (error: any) {
    console.error('[SYNC DUTY RESCHEDULE GET ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🌐 Method POST: Tetap disediakan jika dipanggil via fetch/curl
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await handleDutySync(body.targetWeek);
    return NextResponse.json(result, { status: result.status || 200 });
  } catch (error: any) {
    console.error('[SYNC DUTY RESCHEDULE POST ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
      }
