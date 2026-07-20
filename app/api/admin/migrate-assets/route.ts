import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // 1. Validasi CRON_JOB_API_KEY
    if (key !== process.env.CRON_JOB_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allTeamSlugs = await kv.smembers('global:teams');
    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ message: "Tidak ada tim." });
    }

    // 2. Ambil urutan step saat ini (menggunakan key global yang baru)
    const currentStep = (await kv.get<number>('global:migration_assets_step')) || 0;

    if (currentStep >= allTeamSlugs.length) {
      return NextResponse.json({ message: "✅ SEMUA ASET & BUKTI SELESAI DIMIGRASI!" });
    }

    const slug = allTeamSlugs[currentStep];
    const teamData: any = await kv.hgetall(`teams:${slug}`);
    
    // Objek untuk menampung ID pesan yang berhasil terkirim
    const msgIdsToSave: any = {};

    if (teamData) {
      // ==========================================
      // A. MIGRASI ASET CREATIVE (LOGO)
      // ==========================================
      if (teamData.logoTim) {
        let directDownloadLogo = teamData.logoTim;
        if (teamData.logoTim.includes('/upload/')) {
          const splitUrl = teamData.logoTim.split('/upload/');
          if (splitUrl.length > 1) {
            directDownloadLogo = `https://teamwars.web.id/logo/${splitUrl[1]}/download`;
          }
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
      // B. MIGRASI FINANCE (BUKTI TRANSFER)
      // ==========================================
      if (teamData.buktiTransfer) {
        const formatter = new Intl.DateTimeFormat('id-ID', { 
          day: 'numeric', month: 'long', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' 
        });
        const waktuKonfirmasi = formatter.format(new Date()).replace(':', '.');

        const payloadFinance = {
          content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${teamData.namaTim}**!`,
          embeds: [{
            title: `Detail Registrasi: ${teamData.namaTim}`,
            color: 3066993, // Warna Hijau (Success)
            description: `**✅ PEMBAYARAN TELAH DIKONFIRMASI!**\nTim verifikator telah menyetujui setoran ini dan email konfirmasi otomatis telah meluncur ke peserta.`,
            image: { url: teamData.buktiTransfer },
            fields: [
              { name: "Waktu Konfirmasi", value: `${waktuKonfirmasi} WIB`, inline: true },
              { name: "Status", value: "✅ Terkonfirmasi", inline: true }
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
      // C. SIMPAN ID PESAN KE VERCEL KV
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
