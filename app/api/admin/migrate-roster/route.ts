import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, getFooterText, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const processLogs: string[] = [];

  try {
    // 1. Cek dari database, sudah sampai urutan ke berapa cron job ini berjalan
    // Jika belum pernah jalan sama sekali, mulai dari 0
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
      return NextResponse.json({ 
        message: `✅ Seluruh ${allTeamsData.length} tim sudah berhasil dimigrasi! Cron job bisa dimatikan.` 
      });
    }

    // 2. Ambil HANYA 1 TIM sesuai langkah saat ini
    const teamData = allTeamsData[currentStep];
    const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    
    // Logika dinamis: Mencari siapa yang memegang role Ketua/Wakil di manapun posisi mereka
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
      // Simpan Message ID
      await kv.hset(`teams:${teamData.slug}`, { adminMsgId: msgData.id });
      
      // 4. Update "Langkah" ke database agar 7 menit lagi memproses tim selanjutnya
      await kv.set('migration_step', currentStep + 1);
      
      processLogs.push(`✅ [SUKSES] Tim ${teamData.namaTim} berhasil dimigrasi! Msg ID: ${msgData.id}`);
    } else {
      processLogs.push(`❌ [GAGAL] Tim ${teamData.namaTim} gagal memposting embed`);
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
