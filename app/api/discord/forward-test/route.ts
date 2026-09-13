import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

interface MovedMatchLog {
  matchId: string;
  from: string;
  to: string;
}

function formatDayTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date) + ' WIB';
}

async function handleForwardWeek7() {
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const movedMatches: MovedMatchLog[] = [];

    const updatedSchedules = schedules.map((match) => {
      const isWeek7 =
        match.groupName?.includes('Week 7') ||
        (match as any).week === 7 ||
        (match as any).weekName?.includes('Week 7');

      if (isWeek7 && !match.isFinished) {
        const oldDate = new Date(match.matchDate);
        const newDate = new Date(oldDate);

        // Majukan 1 hari (-24 jam)
        newDate.setDate(newDate.getDate() - 1);

        movedMatches.push({
          matchId: match.id,
          from: formatDayTime(oldDate),
          to: formatDayTime(newDate),
        });

        return {
          ...match,
          matchDate: newDate.toISOString(),
        };
      }

      return match;
    });

    if (movedMatches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada pertandingan Week 7 aktif yang ditemukan untuk dimajukan.',
      });
    }

    await kv.set('twi:schedules', updatedSchedules);

    return NextResponse.json({
      success: true,
      totalMoved: movedMatches.length,
      message: `Sukses memajukan ${movedMatches.length} pertandingan Week 7 ke 1 hari lebih awal.`,
      movedMatches,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return handleForwardWeek7();
}

export async function POST() {
  return handleForwardWeek7();
}
