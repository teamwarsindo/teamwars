import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { TESTER_MATCH_DATA } from '@/lib/config-tester';
import { createTimerControlEmbed } from '@/lib/discord/messages/timerControlEmbed';

export async function handleBtTimer(body: any) {
  const customId = body.data.custom_id; // "toggle_timer_teamA" atau "toggle_timer_teamB"
  const matchId = TESTER_MATCH_DATA.matchId;
  const kvKey = `timer:${matchId}`;

  // Ambil state dari Redis KV, jika belum ada, inisialisasi dari TESTER_MATCH_DATA
  let state: any = await kv.get(kvKey);
  if (!state) {
    state = {
      teamA: { ...TESTER_MATCH_DATA.teamA },
      teamB: { ...TESTER_MATCH_DATA.teamB },
    };
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  // LOGIKA TIM A
  if (customId === 'toggle_timer_teamA') {
    if (!state.teamA.isRunning) {
      state.teamA.isRunning = true;
      state.teamA.hasStarted = true;
      state.teamA.lastStartedAt = nowInSeconds;
    } else {
      const elapsed = nowInSeconds - state.teamA.lastStartedAt;
      state.teamA.remainingSeconds = Math.max(0, state.teamA.remainingSeconds - elapsed);
      state.teamA.isRunning = false;
      state.teamA.lastStartedAt = null;
    }
  }

  // LOGIKA TIM B
  if (customId === 'toggle_timer_teamB') {
    if (!state.teamB.isRunning) {
      state.teamB.isRunning = true;
      state.teamB.hasStarted = true;
      state.teamB.lastStartedAt = nowInSeconds;
    } else {
      const elapsed = nowInSeconds - state.teamB.lastStartedAt;
      state.teamB.remainingSeconds = Math.max(0, state.teamB.remainingSeconds - elapsed);
      state.teamB.isRunning = false;
      state.teamB.lastStartedAt = null;
    }
  }

  // Simpan state terbaru ke Redis KV
  await kv.set(kvKey, state);

  // Buat Payload Response Embed & Tombol
  const embedPayload = createTimerControlEmbed(
    {
      teamA: { nama: state.teamA.nama, state: state.teamA },
      teamB: { nama: state.teamB.nama, state: state.teamB },
    },
    nowInSeconds
  );

  // Type 7 = Update Message di Discord
  return NextResponse.json({
    type: 7,
    data: embedPayload,
  });
}
