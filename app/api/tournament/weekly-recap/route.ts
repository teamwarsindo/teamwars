import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { sendOrUpdateWeeklyRecapEmbed } from '@/lib/discord/messages/weekly-recap';

// Helper menghitung Senin minggu berjalan
function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetWeek } = body; // Contoh: "Week 1"

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json({ error: 'Target Week spesifik wajib dipilih' }, { status: 400 });
    }

    // Ambil angka dari string "Week 1" -> 1
    const targetWeekNum = parseInt(targetWeek.replace(/[^0-9]/g, ''), 10);

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (schedules.length === 0) {
      return NextResponse.json({ error: 'Data schedule kosong di Redis' }, { status: 404 });
    }

    // 1. Hitung Senin Pertama Tournament
    const sortedByDate = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    const tournamentStartMonday = getMondayOfWeek(new Date(sortedByDate[0].matchDate));

    // 2. Hitung Tanggal Senin untuk Week Terpilih
    const targetMonday = new Date(tournamentStartMonday);
    targetMonday.setDate(tournamentStartMonday.getDate() + (targetWeekNum - 1) * 7);

    // 3. INISIALISASI TEMPLATE SLOT FIXED RABU S.D. MINGGU (5 HARI)
    // Offset hari dari Senin: Rabu (+2), Kamis (+3), Jumat (+4), Sabtu (+5), Minggu (+6)
    const dayOffsets = [2, 3, 4, 5, 6];
    const dateMap: Record<string, { dateFormatted: string; count: number }> = {};

    dayOffsets.forEach((offset) => {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + offset);

      // YYYY-MM-DD berbasis WIB
      const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
      const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(dayDate).split('-');
      const dateKey = `${year}-${month}-${day}`;

      const dateFormatted = dayDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      // Default count = 0
      dateMap[dateKey] = { dateFormatted, count: 0 };
    });

    // 4. MAP SCHEDULES DENGAN KALKULASI NOMOR MINGGU MURNI & HITUNG KETERSEDIAAN
    const schedulesWithCalculatedWeek = schedules.map((m) => {
      if (!m.matchDate) return { ...m, calculatedNum: 0 };

      const d = new Date(m.matchDate);
      const matchMonday = getMondayOfWeek(d);
      const diffInDays = Math.round((matchMonday.getTime() - tournamentStartMonday.getTime()) / (1000 * 3600 * 24));
      const calculatedNum = Math.floor(diffInDays / 7) + 1;

      // Jika match berada pada target week, masukkan ke counter slot harinya
      if (calculatedNum === targetWeekNum) {
        const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
        const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(d).split('-');
        const dateKey = `${year}-${month}-${day}`;

        if (dateMap[dateKey]) {
          dateMap[dateKey].count += 1;
        }
      }

      return { ...m, calculatedNum };
    });

    // Ekstrak urutan hari Rabu s.d. Minggu
    const dailyMatchCounts = Object.values(dateMap);

    // 5. BROADCAST RECAP KE CHANNEL MATCH PADA WEEK TERPILIH
    let updatedCount = 0;

    for (let i = 0; i < schedules.length; i++) {
      const m = schedulesWithCalculatedWeek[i];

      // Kirim HANYA ke match yang nomor minggunya cocok dan sudah punya channel Discord
      if (m.calculatedNum === targetWeekNum && m.discordChannelId) {
        const newRecapMsgId = await sendOrUpdateWeeklyRecapEmbed({
          channelId: m.discordChannelId,
          weekName: `Week ${targetWeekNum}`,
          dailyMatchCounts,
          existingRecapMsgId: m.recapMsgId,
        });

        if (newRecapMsgId) {
          schedules[i].recapMsgId = newRecapMsgId;
          updatedCount++;
        }
      }
    }

    // 6. Simpan update ID pesan recap ke Redis
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Weekly Recap Week ${targetWeekNum} (Rabu - Minggu) berhasil disebarkan ke ${updatedCount} channel!`,
      updatedCount,
      dailyMatchCounts,
    });
  } catch (error) {
    console.error('Error broadcasting Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
