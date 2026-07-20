import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, getFooterText, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export const dynamic = 'force-dynamic';

// 🚨 GANTI DENGAN ID DISCORD PRIBADIMU
const ADMIN_DISCORD_ID = "MASUKKAN_ID_DISCORD_KAMU_DI_SINI"; 

export async function GET() {
  const processLogs: string[] = [];

  try {
    const currentStep = (await kv.get<number>('migration_step')) || 0;
    processLogs.push(`🚀 [MULAI] Auto-Migrasi Cron Job - Mengeksekusi Urutan Ke-${currentStep}`);

    const allTeamSlugs = await kv.smembers('global:teams');
    const allTeamsData: any[] = [];

    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (teamData) {
        teamData.slug = slug;
        allTeamsData.push(teamData);
      }
    }

    // PENGURUTAN WAKTU
    allTeamsData.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB; 
    });

    // Validasi jika semua tim sudah selesai dimigrasi
    if (currentStep >= allTeamsData.length) {
      // Usaha kirim notif final ke DM Admin
      try {
        const dmFinal = await discordAPI('/users/@me/channels', 'POST', { recipient_id: ADMIN_DISCORD_ID });
        if (dmFinal && dmFinal.id) {
          await discordAPI(`/channels/${dmFinal.id}/messages`, 'POST', { 
            content: `🏁 **SINKRONISASI SELESAI**\nSeluruh ${allTeamsData.length} tim sudah berhasil dimigrasi! Kamu sudah bisa mematikan Cron Job sekarang.` 
          });
        }
      } catch(e) {}

      return NextResponse.json({ 
        message: `✅ Seluruh ${allTeamsData.length} tim sudah berhasil dimigrasi! Cron job bisa dimatikan.` 
      });
    }

    // Ambil 1 tim sesuai urutan
    const teamData = allTeamsData[currentStep];
    const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    
    // Logika dinamis: Mencari siapa yang memegang role Ketua/Wakil di manapun posisinya
    const ketua = players.find((p: any) => p.role === 'Ketua') || players[0];
    const wakil = players.find((p: any) => p.role === 'Wakil Ketua') || players[1] || { ign: '-' };
    const playerListString = players.map((p: any) => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');
    
    const embedColor = hexToDecimal(teamData.warna);
    const logoTim = teamData.logoTim || "";

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
        footer: { text: getFooterText(teamData.createdAt, teamData.updatedAt) }
      }]
    };

    // Tembak Bot API ke CH_ROSTER
    const msgData = await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages`, 'POST', payload);

    if (msgData && msgData.id) {
      // Simpan Message ID
      await kv.hset(`teams:${teamData.slug}`, { adminMsgId: msgData.id });
      await kv.set('migration_step', currentStep + 1);
      
      const logPesan = `✅ [SUKSES] Tim ${teamData.namaTim} berhasil dimigrasi! Msg ID: ${msgData.id}`;
      processLogs.push(logPesan);

      // KIRM DM KE ADMIN
      try {
        const dmChannel = await discordAPI('/users/@me/channels', 'POST', { recipient_id: ADMIN_DISCORD_ID });
        if (dmChannel && dmChannel.id) {
          await discordAPI(`/channels/${dmChannel.id}/messages`, 'POST', { 
            content: `📢 **Log Migrasi [Step ${currentStep + 1}/${allTeamsData.length}]**\n✅ Tim **${teamData.namaTim}** berhasil dikirim ke server.\nID Pesan: \`${msgData.id}\`\n*Sistem akan mengirim tim selanjutnya dalam 7 menit.*` 
          });
        }
      } catch (dmErr) {
        processLogs.push("⚠️ Gagal mengirim DM ke admin.");
      }

    } else {
      const logPesan = `❌ [GAGAL] Tim ${teamData.namaTim} gagal memposting embed`;
      processLogs.push(logPesan);
      
      // KIRIM DM ERROR KE ADMIN
      try {
        const dmChannel = await discordAPI('/users/@me/channels', 'POST', { recipient_id: ADMIN_DISCORD_ID });
        if (dmChannel && dmChannel.id) {
          await discordAPI(`/channels/${dmChannel.id}/messages`, 'POST', { 
            content: `🚨 **ERROR MIGRASI [Step ${currentStep + 1}/${allTeamsData.length}]**\n❌ Tim **${teamData.namaTim}** gagal diposting oleh Bot. Mohon cek log Vercel.` 
          });
        }
      } catch(e) {}
    }

    return NextResponse.json({
      success: true,
      message: `Eksekusi Step ${currentStep} Selesai. Menunggu jadwal Cron Job berikutnya.`,
      detail_log: processLogs
    });

  } catch (error: any) {
    processLogs.push(`🔥 FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: String(error), detail_log: processLogs }, { status: 500 });
  }
}
