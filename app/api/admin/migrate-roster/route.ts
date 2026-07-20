import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, getFooterText, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export const dynamic = 'force-dynamic';

// 🚨 GANTI DENGAN ID DISCORD PRIBADIMU
const ADMIN_DISCORD_ID = "470212070957252618"; 

export async function GET() {
  const processLogs: string[] = [];

  try {
    processLogs.push(`🚀 [MULAI] Eksekusi Migrasi Tim Terakhir Saja`);

    const allTeamSlugs = await kv.smembers('global:teams');
    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ message: "Tidak ada data tim." });
    }

    const allTeamsData: any[] = [];
    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (teamData) {
        teamData.slug = slug;
        allTeamsData.push(teamData);
      }
    }

    // 1. PENGURUTAN WAKTU (Dari paling lama ke paling baru)
    allTeamsData.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB; 
    });

    // 2. AMBIL TIM TERAKHIR (Index paling ujung dari array)
    const teamData = allTeamsData[allTeamsData.length - 1];
    
    // (Opsional) Cek jika tim terakhir ini sebenarnya sudah punya adminMsgId (sudah pernah dimigrasi)
    if (teamData.adminMsgId) {
      processLogs.push(`ℹ️ Tim terakhir (${teamData.namaTim}) sudah pernah dimigrasi. Akan di-override / dilewati tergantung kebutuhan.`);
    }

    const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    
    // Logika dinamis mencari posisi role
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

    // 3. Tembak Bot API ke CH_ROSTER
    const msgData = await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages`, 'POST', payload);

    if (msgData && msgData.id) {
      // 4. Simpan Message ID
      await kv.hset(`teams:${teamData.slug}`, { adminMsgId: msgData.id });
      
      const logPesan = `✅ [SUKSES] Tim Terakhir (${teamData.namaTim}) berhasil dimigrasi! Msg ID: ${msgData.id}`;
      processLogs.push(logPesan);

      // 5. KIRIM DM KE ADMIN
      try {
        const dmChannel = await discordAPI('/users/@me/channels', 'POST', { recipient_id: ADMIN_DISCORD_ID });
        if (dmChannel && dmChannel.id) {
          await discordAPI(`/channels/${dmChannel.id}/messages`, 'POST', { 
            content: `📢 **Log Migrasi [Tim Terakhir Saja]**\n✅ Tim **${teamData.namaTim}** berhasil dikirim ke server.\nID Pesan: \`${msgData.id}\`` 
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
            content: `🚨 **ERROR MIGRASI [Tim Terakhir Saja]**\n❌ Tim **${teamData.namaTim}** gagal diposting oleh Bot. Mohon cek log Vercel.` 
          });
        }
      } catch(e) {}
    }

    // Return JSON Final
    return NextResponse.json({
      success: true,
      message: `Eksekusi Tim Terakhir (${teamData.namaTim}) Selesai.`,
      detail_log: processLogs
    });

  } catch (error: any) {
    processLogs.push(`🔥 FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: String(error), detail_log: processLogs }, { status: 500 });
  }
                         }
