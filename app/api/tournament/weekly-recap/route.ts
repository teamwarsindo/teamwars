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
    const { targetWeek } = body; // Contoh dari frontend: "Week 1"

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json({ error: 'Target Week spesifik wajib dipilih' }, { status: 400 });
    }

    // Ambil angka dari string "Week 1" -> 1
    const targetWeekNum = parseInt(targetWeek.replace(/[^0-9]/g, ''), 10);

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (schedules.length === 0) {
      return NextResponse.json({ error: 'Data schedule kosong di Redis' }, { status: 404 });
    }

    // Hitung Senin Pertama Tournament
    const sortedByDate = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    const tournamentStartMonday = getMondayOfWeek(new Date(sortedByDate[0].matchDate));

    // Map schedules dengan kalkulasi nomor minggu murni
    const schedulesWithCalculatedWeek = schedules.map((m) => {
      const matchMonday = getMondayOfWeek(new Date(m.matchDate));
      const diffInDays = Math.round((matchMonday.getTime() - tournamentStartMonday.getTime()) / (1000 * 3600 * 24));
      const calculatedNum = Math.floor(diffInDays / 7) + 1;
      return { ...m, calculatedNum };
    });

    // 1. FILTER HANYA MATCH YANG BERADA DI MINGGU TERPILIH (Strict Numeric Comparison)
    const weekMatches = schedulesWithCalculatedWeek.filter((m) => m.calculatedNum === targetWeekNum);

    if (weekMatches.length === 0) {
      return NextResponse.json({ error: `Tidak ada match ditemukan untuk Week ${targetWeekNum}` }, { status: 404 });
    }

    // 2. Hitung jumlah match per hari KHUSUS MINGGU INI SAJA
    const dateMap: Record<string, { dateFormatted: string; count: number }> = {};

    weekMatches.forEach((m) => {
      if (!m.matchDate) return;
      const d = new Date(m.matchDate);
      const keyIso = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      const dateFormatted = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      if (!dateMap[keyIso]) {
        dateMap[keyIso] = { dateFormatted, count: 0 };
      }
      dateMap[keyIso].count += 1;
    });

    const dailyMatchCounts = Object.keys(dateMap)
      .sort()
      .map((k) => dateMap[k]);

    // 3. BROADCAST KE CHANNEL MATCH PADA WEEK TERPILIH
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

    // 4. Simpan ke Redis
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Weekly Recap Week ${targetWeekNum} berhasil disebarkan ke ${updatedCount} channel!`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error broadcasting Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
