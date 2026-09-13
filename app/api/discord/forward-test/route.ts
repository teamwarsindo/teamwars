import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

export async function POST(req: Request) {
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    let updatedCount = 0;

    // Filter jadwal khusus Week 7 yang belum selesai
    const updatedSchedules = schedules.map((m) => {
      const isWeek7 = m.groupName?.includes('Week 7') || (m as any).week === 7 || (m as any).weekName?.includes('Week 7');

      if (isWeek7 && !m.isFinished) {
        const currentDate = new Date(m.matchDate);

        // Majukan 1 hari (-24 jam)
        currentDate.setDate(currentDate.getDate() - 1);

        updatedCount++;
        return {
          ...m,
          matchDate: currentDate.toISOString(),
        };
      }
      return m;
    });

    await kv.set('twi:schedules', updatedSchedules);

    return NextResponse.json({
      success: true,
      message: `Berhasil memajukan ${updatedCount} pertandingan Week 7 ke 1 hari lebih awal.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
