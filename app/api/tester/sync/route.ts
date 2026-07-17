import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
// Sesuaikan import path ini dengan struktur folder Anda
import { sendTeamTracker } from '@/lib/discord'; 

export async function GET() {
  try {
    // 1. Ambil semua slug tim dari Redis
    const allTeamSlugs = await kv.smembers('global:teams');
    
    const patchedTeams = [];
    const failedTeams = [];
    let skippedCount = 0;

    for (const slug of allTeamSlugs) {
      const kvKey = `teams:${slug}`;
      const teamData: any = await kv.hgetall(kvKey);

      if (!teamData) continue;

      // 2. Filter: Tim yang punya discordChannelId TAPI trackerMsgId-nya kosong/falsy
      if (teamData.discordChannelId && !teamData.trackerMsgId) {
        try {
          // Parse string JSON players dari database menjadi array object
          const players = typeof teamData.players === 'string' 
            ? JSON.parse(teamData.players) 
            : teamData.players;

          // 3. Tembakkan pesan Tracker ke channel tim tersebut
          const trackerMsgId = await sendTeamTracker({
            channelId: teamData.discordChannelId,
            namaTim: teamData.namaTim,
            warna: teamData.warna,
            roleId: teamData.discordRoleId,
            players: players
          });

          // 4. Jika sukses terkirim dan mendapat ID, update brankas Redis
          if (trackerMsgId) {
            await kv.hset(kvKey, { trackerMsgId: trackerMsgId });
            patchedTeams.push(teamData.namaTim);
          } else {
            failedTeams.push(teamData.namaTim);
          }
        } catch (err) {
          console.error(`Gagal patch tim ${teamData.namaTim}:`, err);
          failedTeams.push(teamData.namaTim);
        }
      } else {
        // Tim sudah punya tracker atau malah belum punya channel sama sekali
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Proses sinkronisasi Tracker selesai.",
      results: {
        berhasilDitambal: patchedTeams,
        gagalDitambal: failedTeams,
        dilewati: skippedCount
      }
    });

  } catch (error: unknown) {
    console.error("API Patcher Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan pada server saat patching" }, 
      { status: 500 }
    );
  }
}
