import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schedules = (await kv.get<any[]>('twi:schedules')) || [];

    // Filter 4 match Quarter-Final (Week 9 / QF 1-4)
    const qfMatches = schedules.filter((m) => {
      const title = String(m.matchTitle || m.title || m.name || '').toLowerCase();
      const id = String(m.id || '').toLowerCase();
      return (
        title.includes('quarter') ||
        id.includes('qf') ||
        Number(m.weekNumber || m.week) === 9
      );
    });

    if (qfMatches.length === 0) {
      return NextResponse.json({ error: 'Match Quarter-Final tidak ditemukan di twi:schedules' }, { status: 404 });
    }

    // 4 Pilihan Tanggal Resmi (Kamis - Minggu, 1 - 4 Okt 2026, 20:00 WIB = 13:00 UTC)
    const availableDates = [
      '2026-10-01T13:00:00.000Z', // Kamis, 1 Okt 2026 20:00 WIB
      '2026-10-02T13:00:00.000Z', // Jumat, 2 Okt 2026 20:00 WIB
      '2026-10-03T13:00:00.000Z', // Sabtu, 3 Okt 2026 20:00 WIB
      '2026-10-04T13:00:00.000Z', // Minggu, 4 Okt 2026 20:00 WIB
    ];

    // Algoritma Fisher-Yates Shuffle untuk mengacak urutan tanggal secara adil
    for (let i = availableDates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableDates[i], availableDates[j]] = [availableDates[j], availableDates[i]];
    }

    // Pasangkan tanggal acak ke masing-masing match QF
    const updatedSummary: any[] = [];
    qfMatches.forEach((match, index) => {
      if (availableDates[index]) {
        match.matchDate = availableDates[index];
        updatedSummary.push({
          id: match.id,
          title: match.matchTitle || match.id,
          teamA: match.teamAName,
          teamB: match.teamBName,
          newDateWIB: new Date(match.matchDate).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
    });

    // Simpan kembali seluruh jadwal ke KV
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: 'Jadwal tanggal tanding Quarter-Final berhasil diacak!',
      schedule: updatedSummary,
    });
  } catch (error: any) {
    console.error('Shuffle QF Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
