import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function GET(request: NextRequest) {
  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ message: "Tidak ada tim." });
    }

    // 1. Tarik semua data tim untuk diurutkan
    const rawTeamsData = await Promise.all(
      allTeamSlugs.map(async (slug) => {
        const data: any = await kv.hgetall(`teams:${slug}`);
        return { slug, ...data };
      })
    );

    // 2. URUTKAN BERDASARKAN TANGGAL DAFTAR (Paling lama -> Paling baru)
    const sortedTeams = rawTeamsData
      .filter(team => team && team.namaTim) // Pastikan data tidak kosong
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB; 
      });

    // 3. Ambil urutan step saat ini
    const currentStep = (await kv.get<number>('global:migration_assets_step')) || 0;

    if (currentStep >= sortedTeams.length) {
      return NextResponse.json({ message: "✅ SEMUA ASET & BUKTI SELESAI DIMIGRASI!" });
    }

    // 4. Pilih tim berdasarkan urutan yang sudah disortir
    const teamData = sortedTeams[currentStep];
    const slug = teamData.slug;
    const msgIdsToSave: any = {};

    if (teamData) {
      // ==========================================
      // A. MIGRASI CREATIVE (LOGO)
      // ==========================================
      if (teamData.logoTim) {
        let directDownloadLogo = teamData.logoTim;
        if (teamData.logoTim.includes('/logo/') && !teamData.logoTim.endsWith('/download')) {
          directDownloadLogo = `${teamData.logoTim}/download`;
        }

        const payloadCreative = {
          content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim: **${teamData.namaTim}**!`,
          embeds: [{
            title: `Aset Visual: ${teamData.namaTim}`,
            color: hexToDecimal(teamData.warna),
            description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
            image: { url: teamData.logoTim },
            fields: [
              { name: "Kode Warna (Hex)", value: `\`${teamData.warna}\``, inline: true }
            ]
          }]
        };

        try {
          const resCreative: any = await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOGO}/messages`, 'POST', payloadCreative);
          if (resCreative && resCreative.id) msgIdsToSave.creativeMsgId = resCreative.id;
        } catch (e) {
          console.error(`Gagal migrasi Logo untuk ${teamData.namaTim}:`, e);
        }
      }

      // ==========================================
      // B. MIGRASI FINANCE (BUKTI TRANSFER - TEMPLATE AWAL)
      // ==========================================
      if (teamData.buktiTransfer) {
        const dateString = teamData.createdAt || new Date().toISOString();
        const d = new Date(dateString);
        const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
        const waktu = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.');
        const formattedTime = `${tgl} pukul ${waktu}`;

        const payloadFinance = {
          content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${teamData.namaTim}**!`,
          embeds: [{
            title: `Detail Registrasi: ${teamData.namaTim}`,
            color: hexToDecimal(teamData.warna), 
            description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${slug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
            image: { url: teamData.buktiTransfer },
            fields: [
              { name: "Waktu Submit", value: `${formattedTime} WIB`, inline: true },
              { name: "Status", value: "🟡 Menunggu Konfirmasi", inline: true }
            ]
          }]
        };

        try {
          const resFinance: any = await discordAPI(`/channels/${DISCORD_CONFIG.CH_BUKTI}/messages`, 'POST', payloadFinance);
          if (resFinance && resFinance.id) msgIdsToSave.financeMsgId = resFinance.id;
        } catch (e) {
          console.error(`Gagal migrasi Bukti untuk ${teamData.namaTim}:`, e);
        }
      }

      // ==========================================
      // C. SIMPAN ID PESAN KE DB
      // ==========================================
      if (Object.keys(msgIdsToSave).length > 0) {
        await kv.hset(`teams:${slug}`, msgIdsToSave);
      }
    }

    // Lanjut ke step berikutnya
    await kv.set('global:migration_assets_step', currentStep + 1);

    return NextResponse.json({ 
      success: true, 
      message: `Migrasi Aset & Bukti ke-${currentStep + 1} (${teamData?.namaTim}) sukses.` 
    });

  } catch (error) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
