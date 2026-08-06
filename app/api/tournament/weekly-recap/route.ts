import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/lib/types/tournament';
import {
  ScheduleMatch,
  sendOrUpdateWeeklyScheduleAndRecap,
} from '@/lib/discord/messages/weekly-recap';

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

    const targetWeekNum = parseInt(targetWeek.replace(/[^0-9]/g, ''), 10);

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (schedules.length === 0) {
      return NextResponse.json({ error: 'Data schedule kosong di Redis' }, { status: 404 });
    }

    // Target Channel Khusus (CH_SCHEDULE: '1533867924824133773')
    const targetChannelId = DISCORD_CONFIG.CH_SCHEDULE;
    if (!targetChannelId) {
      return NextResponse.json({ error: 'Channel ID Schedule belum dikonfigurasi' }, { status: 500 });
    }

    // 1. Hitung Senin Pertama Tournament
    const sortedByDate = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    const tournamentStartMonday = getMondayOfWeek(new Date(sortedByDate[0].matchDate));

    // 2. Hitung Tanggal Senin untuk Week Terpilih
    const targetMonday = new Date(tournamentStartMonday);
    targetMonday.setDate(tournamentStartMonday.getDate() + (targetWeekNum - 1) * 7);

    // 3. TEMPLATE SLOT FIXED RABU S.D. MINGGU (5 HARI)
    const dayOffsets = [2, 3, 4, 5, 6];
    const dateMap: Record<string, { dateFormatted: string; count: number }> = {};

    dayOffsets.forEach((offset) => {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + offset);

      const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
      const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(dayDate).split('-');
      const dateKey = `${year}-${month}-${day}`;

      const dayNameFormatted = dayDate.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
      const dayNumFormatted = dayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

      dateMap[dateKey] = { dateFormatted: `${dayNameFormatted}, ${dayNumFormatted}`, count: 0 };
    });

    const groupASchedules: Array<ScheduleMatch> = [];
    const groupBSchedules: Array<ScheduleMatch> = [];

    // 4. MAPPING DENGAN JAM LENGKAP PER MATCH
    schedules.forEach((m: any) => {
      if (!m.matchDate) return;

      const d = new Date(m.matchDate);
      const matchMonday = getMondayOfWeek(d);
      const diffInDays = Math.round((matchMonday.getTime() - tournamentStartMonday.getTime()) / (1000 * 3600 * 24));
      const calculatedNum = Math.floor(diffInDays / 7) + 1;

      if (calculatedNum === targetWeekNum) {
        // Hitung slot ketersediaan hari
        const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
        const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(d).split('-');
        const dateKey = `${year}-${month}-${day}`;

        if (dateMap[dateKey]) {
          dateMap[dateKey].count += 1;
        }

        // Ekstrak Tanggal & Jam
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
        const dateFormattedStr = `${dayName}, ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;
        const timeFormattedStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':') + ' WIB';

        const matchObj: ScheduleMatch = {
          dateStr: dateFormattedStr,
          timeStr: timeFormattedStr,
          team1Emoji: m.team1Emoji || m.teamAEmoji || '',
          team1Name: m.team1Name || m.teamAName || 'Team A',
          team2Emoji: m.team2Emoji || m.teamBEmoji || '',
          team2Name: m.team2Name || m.teamBName || 'Team B',
        };

        const groupName = (m.group || m.groupName || 'A').toUpperCase();
        if (groupName.includes('B')) {
          groupBSchedules.push(matchObj);
        } else {
          groupASchedules.push(matchObj);
        }
      }
    });

    const dailyMatchCounts = Object.values(dateMap);

    // Ambil Simpanan ID Pesan Lama dari Redis
    const existingMsgIds = (await kv.get<{ recapMsgId?: string; groupAMsgId?: string; groupBMsgId?: string }>(
      `twi:schedule_msg_ids:${targetWeekNum}`
    )) || {};

    // 5. UPDATE MURNI DENGAN PATCH KE CHANNEL SCHEDULE
    const updatedMsgIds = await sendOrUpdateWeeklyScheduleAndRecap({
      channelId: targetChannelId,
      weekName: `Week ${targetWeekNum}`,
      dailyMatchCounts,
      groupASchedules,
      groupBSchedules,
      existingMsgIds,
    });

    // 6. SIMPAN ID PESAN TERBARU KE REDIS
    await kv.set(`twi:schedule_msg_ids:${targetWeekNum}`, updatedMsgIds);

    return NextResponse.json({
      success: true,
      message: `Berhasil melakukan PATCH pada 3 pesan Jadwal & Rekap Week ${targetWeekNum}!`,
      channelId: targetChannelId,
      msgIds: updatedMsgIds,
      summary: {
        totalGroupA: groupASchedules.length,
        totalGroupB: groupBSchedules.length,
      },
    });
  } catch (error) {
    console.error('Error PATCH Schedule & Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
