import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, DIVISION_MAP } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import {
  sendOrUpdateWeeklyScheduleAndRecap,
  deleteWeeklyScheduleAndRecap,
} from '@/lib/discord/messages/weekly-recap';

const KV_KEY_SCHEDULES = 'twi:schedules';

// 🟢 HELPER TANGGAL UNTUK MEMECAH WEEK JIKA KV BELUM MEMILIKI weekNumber
function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = new Date('2026-08-03T00:00:00+07:00').getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export async function POST(req: Request) {
  try {
    const { targetWeek } = await req.json(); // Contoh: "Week 1" atau "Week 2"

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json(
        { error: 'Silakan pilih minggu spesifik pada filter sebelum broadcast.' },
        { status: 400 }
      );
    }

    const weekNumber = parseInt(targetWeek.replace('Week ', ''), 10);
    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    // 🟢 PERBAIKAN: Hitung weekNumber secara otomatis jika di KV bernilai undefined
    const weekMatches = schedules.filter((m) => {
      const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
      return computedWeek === weekNumber;
    });

    if (weekMatches.length === 0) {
      return NextResponse.json(
        { error: `Tidak ada jadwal pertandingan untuk ${targetWeek}` },
        { status: 400 }
      );
    }

    // Pisahkan jadwal berdasarkan DIVISION_MAP
    const groupAMatches = weekMatches.filter(
      (m) => m.groupName === DIVISION_MAP.GROUP_A || m.groupName === 'Group A'
    );
    const groupBMatches = weekMatches.filter(
      (m) => m.groupName === DIVISION_MAP.GROUP_B || m.groupName === 'Group B'
    );

    // Format item untuk helper weekly-recap
    const formatScheduleMatch = (m: MatchScheduleItem) => {
      const d = new Date(m.matchDate);
      const dateStr = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      const timeStr =
        d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta',
        }) + ' WIB';

      return {
        matchDateIso: m.matchDate,
        dateStr,
        timeStr,
        team1Name: m.teamAName,
        team2Name: m.teamBName,
      };
    };

    const groupASchedules = groupAMatches.map(formatScheduleMatch);
    const groupBSchedules = groupBMatches.map(formatScheduleMatch);

    // Hitung ketersediaan slot harian
    const countsMap = new Map<string, { dateFormatted: string; count: number }>();
    weekMatches.forEach((m) => {
      const d = new Date(m.matchDate);
      const dateKey = d.toISOString().split('T')[0];
      const dateFormatted = d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      if (!countsMap.has(dateKey)) {
        countsMap.set(dateKey, { dateFormatted, count: 0 });
      }
      countsMap.get(dateKey)!.count += 1;
    });

    const dailyMatchCounts = Array.from(countsMap.entries())
      .map(([dateKey, val]) => ({
        dateKey,
        dateFormatted: val.dateFormatted,
        count: val.count,
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    // Ambil Cache Msg ID
    const cacheKey = `twi:schedule_msg_ids:${weekNumber}`;
    const existingMsgIds = (await kv.get<any>(cacheKey)) || {};

    const result = await sendOrUpdateWeeklyScheduleAndRecap({
      channelId: DISCORD_CONFIG.CH_SCHEDULE,
      weekName: targetWeek,
      weekDateRangeStr: `Jadwal Pertandingan ${targetWeek}`,
      dailyMatchCounts,
      groupASchedules,
      groupBSchedules,
      existingMsgIds,
    });

    // Simpan cache pesan terbaru ke KV
    await kv.set(cacheKey, result);

    return NextResponse.json({
      success: true,
      message: `Weekly Recap ${targetWeek} berhasil disebarkan ke Discord!`,
      msgIds: result,
    });
  } catch (error) {
    console.error('Error POST Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { targetWeek } = await req.json();

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json(
        { error: 'Silakan pilih minggu spesifik pada filter.' },
        { status: 400 }
      );
    }

    const weekNumber = parseInt(targetWeek.replace('Week ', ''), 10);
    const cacheKey = `twi:schedule_msg_ids:${weekNumber}`;
    const existingMsgIds = (await kv.get<any>(cacheKey)) || {};

    if (existingMsgIds) {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds,
        deleteRecapToo: true,
      });

      await kv.del(cacheKey);
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast Recap ${targetWeek} berhasil dihapus dari Discord!`,
    });
  } catch (error) {
    console.error('Error DELETE Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
