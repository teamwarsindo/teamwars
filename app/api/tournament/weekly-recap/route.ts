import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, DIVISION_MAP } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import {
  sendOrUpdateWeeklyScheduleAndRecap,
  deleteWeeklyScheduleAndRecap,
} from '@/lib/discord/messages/weekly-recap';

const KV_KEY_SCHEDULES = 'twi:schedules';
// 🟢 CACHE RECAP GLOBAL DI LUAR (SELALU DELETE & RE-POST DI POSISI PALING BAWAH)
const KV_KEY_GLOBAL_RECAP = 'twi:global_recap_msg_id';

// Helper hitung minggu berbasis tanggal jika Vercel KV belum menyimpan field weekNumber
function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = new Date('2026-08-03T00:00:00+07:00').getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// Helper format YYYY-MM-DD berbasis WIB (Asia/Jakarta)
function getWibDateKey(dateObj: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

export async function POST(req: Request) {
  try {
    const { targetWeek } = await req.json(); // Contoh: "Week 2"

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json(
        { error: 'Silakan pilih minggu spesifik pada filter sebelum broadcast.' },
        { status: 400 }
      );
    }

    const weekNumber = parseInt(targetWeek.replace('Week ', ''), 10);
    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    // Filter match khusus minggu yang dipilih (dengan auto-fallback hitung minggu)
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

    // 1. PISAHKAN JADWAL GROUP A & B
    const groupAMatches = weekMatches.filter(
      (m) => m.groupName === DIVISION_MAP.GROUP_A || m.groupName === 'Group A'
    );
    const groupBMatches = weekMatches.filter(
      (m) => m.groupName === DIVISION_MAP.GROUP_B || m.groupName === 'Group B'
    );

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

    // 🟢 2. LOGIKA GENERATE SLOT RESCHEDULE (RABU S/D MINGGU) & FILTER HARI BERLALU
    const todayWibStr = getWibDateKey(new Date());

    // Cari tanggal pertandingan paling awal di minggu ini sebagai acuan
    const matchDates = weekMatches
      .map((m) => new Date(m.matchDate).getTime())
      .sort((a, b) => a - b);
    const earliestDate = new Date(matchDates[0]);

    // Cari hari Rabu di minggu tersebut (0=Minggu, 1=Senin, ..., 3=Rabu)
    const dayOfWeek = earliestDate.getDay();
    const diffToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
    const wednesdayDate = new Date(earliestDate);
    wednesdayDate.setDate(earliestDate.getDate() - diffToWed);

    // Hitung jumlah match terdaftar per tanggal (WIB)
    const matchCountByDate = new Map<string, number>();
    weekMatches.forEach((m) => {
      const dateKey = getWibDateKey(new Date(m.matchDate));
      matchCountByDate.set(dateKey, (matchCountByDate.get(dateKey) || 0) + 1);
    });

    // Generate 5 Hari Slot (Rabu, Kamis, Jumat, Sabtu, Minggu)
    const dailyMatchCounts: { dateKey: string; dateFormatted: string; count: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const currentDate = new Date(wednesdayDate);
      currentDate.setDate(wednesdayDate.getDate() + i);

      const dateKey = getWibDateKey(currentDate);

      // 🔴 FILTER: Abaikan hari yang sudah berlalu sebelum hari ini
      if (dateKey < todayWibStr) {
        continue;
      }

      const dateFormatted = currentDate.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      const currentCount = matchCountByDate.get(dateKey) || 0;

      dailyMatchCounts.push({
        dateKey,
        dateFormatted,
        count: currentCount,
      });
    }

    // 3. AMBIL CACHE MSG DENGAN STRUKTUR TERPISAH
    const weekGroupCacheKey = `twi:schedule_msg_ids:${weekNumber}`;
    const existingGroupMsgIds = (await kv.get<{ groupAMsgId?: string; groupBMsgId?: string }>(weekGroupCacheKey)) || {};
    const existingGlobalRecapId = (await kv.get<{ recapMsgId?: string }>(KV_KEY_GLOBAL_RECAP)) || {};

    // 4. HAPUS PESAN RECAP LAMA TERLEBIH DAHULU (DELETE)
    if (existingGlobalRecapId?.recapMsgId) {
      try {
        await deleteWeeklyScheduleAndRecap({
          channelId: DISCORD_CONFIG.CH_SCHEDULE,
          existingMsgIds: { recapMsgId: existingGlobalRecapId.recapMsgId },
          deleteRecapToo: true,
        });
        await kv.del(KV_KEY_GLOBAL_RECAP);
      } catch (err) {
        console.warn('Gagal menghapus recap lama, lanjut kirim baru:', err);
      }
    }

    // 5. SEND/UPDATE DISCORD (PATCH GROUP A & B, RECAP DI-POST DI POSISI PALING BAWAH)
    const result = await sendOrUpdateWeeklyScheduleAndRecap({
      channelId: DISCORD_CONFIG.CH_SCHEDULE,
      weekName: targetWeek,
      weekDateRangeStr: `Jadwal Pertandingan ${targetWeek}`,
      dailyMatchCounts,
      groupASchedules,
      groupBSchedules,
      existingMsgIds: {
        groupAMsgId: existingGroupMsgIds.groupAMsgId,
        groupBMsgId: existingGroupMsgIds.groupBMsgId,
      },
    });

    // 6. SIMPAN MASING-MASING CACHE KE KV TERPISAH
    await kv.set(weekGroupCacheKey, {
      groupAMsgId: result.groupAMsgId,
      groupBMsgId: result.groupBMsgId,
    });

    if (result.recapMsgId) {
      await kv.set(KV_KEY_GLOBAL_RECAP, {
        recapMsgId: result.recapMsgId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Weekly Broadcast ${targetWeek} berhasil disebarkan ke Discord!`,
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
    const weekGroupCacheKey = `twi:schedule_msg_ids:${weekNumber}`;

    const existingGroupMsgIds = (await kv.get<any>(weekGroupCacheKey)) || {};
    const existingGlobalRecapId = (await kv.get<any>(KV_KEY_GLOBAL_RECAP)) || {};

    // Hapus Group A & B untuk minggu terkait
    if (existingGroupMsgIds) {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds: existingGroupMsgIds,
        deleteRecapToo: false,
      });
      await kv.del(weekGroupCacheKey);
    }

    // Hapus Recap Global jika ada
    if (existingGlobalRecapId?.recapMsgId) {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds: { recapMsgId: existingGlobalRecapId.recapMsgId },
        deleteRecapToo: true,
      });
      await kv.del(KV_KEY_GLOBAL_RECAP);
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
  
