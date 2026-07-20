import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, getFooterText, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Izinkan waktu eksekusi Vercel lebih lama

export async function GET() {
  const processLogs: string[] = [];

  try {
    processLogs.push("🚀 [MULAI] Migrasi Pesan Roster: Webhook -> Bot API");

    // 1. Tarik semua tim dari database
    const allTeamSlugs = await kv.smembers('global:teams');
    let migratedCount = 0;

    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData) continue;

      // 2. Parsing Data (Mirip dengan logika pendaftaran awal)
      const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      
      // Ambil spesifik ketua dan wakil untuk fields
      const ketua = players.find((p: any) => p.role === 'Ketua') || players[0];
      const wakil = players.find((p: any) => p.role === 'Wakil Ketua') || players[1] || { ign: '-' };
      
      const playerListString = players.map((p: any) => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');
      const embedColor = hexToDecimal(teamData.warna);
      const logoTim = teamData.logoTim || "";

      // 3. Siapkan payload embed sesuai dengan format Admin/Roster Webhook lama
      const payload = {
        embeds: [{
          title: teamData.namaTim,
          color: embedColor,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketua.ign, inline: true },
            { name: "Wakil", value: wakil.ign, inline: true },
            { name: "Players", value: playerListString, inline: false }
          ],
          // Fungsi getFooterText akan otomatis mencetak 'Diperbarui pada...' jika nilai updatedAt tersedia
          footer: { text: getFooterText(teamData.createdAt, teamData.updatedAt) }
        }]
      };

      // 4. Tembak Bot API (Create Message Baru) ke CH_ROSTER
      const msgData = await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages`, 'POST', payload);

      if (msgData && msgData.id) {
        // 5. Timpa adminMsgId lama (Webhook) dengan Message ID baru (Bot)
        // Catatan: Tetap menggunakan key 'adminMsgId' agar tidak merusak fungsi/logika pemanggilan di kode yang sudah ada
        await kv.hset(`teams:${slug}`, {
          adminMsgId: msgData.id 
        });
        
        processLogs.push(`✅ [SUKSES] Tim ${teamData.namaTim} -> Migrasi Msg ID: ${msgData.id}`);
        migratedCount++;
      } else {
        processLogs.push(`❌ [GAGAL] Tim ${teamData.namaTim} -> Gagal memposting embed via Bot`);
      }

      // Jeda 300ms antar pengiriman agar aman dari Rate Limit Discord
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    processLogs.push(`🏁 MIGRASI SELESAI. Total diproses: ${migratedCount} Tim.`);

    return NextResponse.json({
      success: true,
      message: "Migrasi Roster Webhook ke Bot API berhasil",
      detail_log: processLogs
    });

  } catch (error: any) {
    processLogs.push(`🔥 FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: String(error), detail_log: processLogs }, { status: 500 });
  }
}
