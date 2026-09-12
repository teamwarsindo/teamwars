import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

export async function GET() {
  try {
    const matchId = 'match-48';
    const ventId = '622438955429789726';
    const msgId = '1548172080334503979';
    const scoreA = 9;  // FPF Fabulous
    const scoreB = 10; // DS Octagram

    // 1. UPDATE twi:schedules
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const idx = schedules.findIndex((m) => m.id === matchId);

    if (idx === -1) {
      return NextResponse.json({ error: `Match ${matchId} tidak ditemukan di schedules` }, { status: 404 });
    }

    schedules[idx].referee = 'Vent';
    schedules[idx].refereeDiscordId = ventId;
    (schedules[idx] as any).refereeLogMsgId = msgId;
    schedules[idx].scoreA = scoreA;
    schedules[idx].scoreB = scoreB;
    schedules[idx].isFinished = false; // Buka kembali agar bisa di-unassign secara legal

    await kv.set('twi:schedules', schedules);

    // 2. UPDATE twi:staff_history (kembalikan match ke riwayat aktif Vent)
    // Key biasanya berupa hash atau JSON list per role/staff
    const historyKey = `twi:staff_history:REFEREE:${ventId}`;
    let history = (await kv.get<string[]>(historyKey)) || [];
    if (!history.includes(matchId)) {
      history.push(matchId);
      await kv.set(historyKey, history);
    }

    // Jika sistemmu menyimpan di hash global twi:staff_history:
    try {
      const globalHistory = (await kv.hget<string[]>('twi:staff_history', ventId)) || [];
      if (!globalHistory.includes(matchId)) {
        globalHistory.push(matchId);
        await kv.hset('twi:staff_history', { [ventId]: globalHistory });
      }
    } catch {
      // Abaikan jika struktur hash berbeda
    }

    return NextResponse.json({
      success: true,
      message: `Match ${matchId} berhasil di-restore untuk Vent!`,
      data: {
        matchId,
        referee: 'Vent',
        refereeDiscordId: ventId,
        refereeLogMsgId: msgId,
        score: `${scoreA}-${scoreB}`,
        isFinished: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
