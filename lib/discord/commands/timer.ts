import { NextResponse } from 'next/server';
import { TESTER_MATCH_DATA } from '@/lib/config-tester';
import { createTimerControlEmbed } from '@/lib/discord/messages/timerControlEmbed';

export async function handleTimerCommand(body: any) {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Gunakan data dari config-tester
  const payload = createTimerControlEmbed(
    {
      teamA: { nama: TESTER_MATCH_DATA.teamA.nama, state: TESTER_MATCH_DATA.teamA },
      teamB: { nama: TESTER_MATCH_DATA.teamB.nama, state: TESTER_MATCH_DATA.teamB },
    },
    nowInSeconds
  );

  // Type 4 = Kirim pesan biasa sebagai balasan command Discord
  return NextResponse.json({
    type: 4,
    data: payload,
  });
}
