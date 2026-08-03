import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

// 🗜️ Fungsi Pembantu: Mengompresi URL logo menggunakan Cloudinary CDN Transformation
function getOptimizedLogoUrl(originalUrl: string): string {
  if (!originalUrl || !originalUrl.startsWith('http')) return originalUrl;

  // Jika URL sudah merupakan URL Cloudinary murni
  if (originalUrl.includes('res.cloudinary.com') && originalUrl.includes('/upload/')) {
    return originalUrl.replace('/upload/', '/upload/w_128,h_128,c_fill,q_auto,f_png/');
  }

  // Jika URL berformat lain atau URL masking, manfaatkan Fetch URL Cloudinary untuk kompresi otomatis
  if (CLOUD_NAME) {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/w_128,h_128,c_fill,q_auto,f_png/${encodedUrl}`;
  }

  return originalUrl;
}

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    if (!teamKeys || teamKeys.length === 0) {
      return NextResponse.json({ success: false, message: "Tidak ada tim ditemukan di database." });
    }

    const rawTeams = await Promise.all(
      teamKeys.map((key) => kv.hgetall<Record<string, any>>(key))
    );

    const teams = rawTeams
      .filter((team): team is Record<string, any> => Boolean(team))
      .map((team) => ({
        name: team?.namaTim || team?.name || 'Unknown Team',
        logo: team?.logoTim || team?.logo || '',
      }));

    let existingEmojis: any[] = [];
    try {
      existingEmojis = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'GET');
    } catch (e) {
      console.warn("Gagal mengambil daftar emoji eksisting:", e);
    }

    const existingNames = new Set(
      Array.isArray(existingEmojis) ? existingEmojis.map((e) => e.name) : []
    );

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (const team of teams) {
      if (!team.logo || !team.logo.startsWith("http")) {
        failedCount++;
        details.push(`⚠️ Skipped ${team.name}: URL logo tidak valid.`);
        continue;
      }

      const rawEmojiName = team.name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();

      const validName = (rawEmojiName.length < 2 ? `t_${rawEmojiName}` : rawEmojiName).slice(0, 32);

      if (existingNames.has(validName)) {
        failedCount++;
        details.push(`ℹ️ Skipped ${team.name}: Emoji :${validName}: sudah ada di Discord.`);
        continue;
      }

      try {
        // 🚀 Terapkan kompresi URL otomatis (Ukuran turun dari ~2 MB jadi ~15 KB)
        const optimizedUrl = getOptimizedLogoUrl(team.logo);
        
        // 🟢 PERBAIKAN: Fetch rapi tanpa menggunakan `var`
        let arrayBuffer: ArrayBuffer;
        let contentType = "image/png";

        const imageRes = await fetch(optimizedUrl);
        if (!imageRes.ok) {
          // Fallback ke URL asli jika fetch Cloudinary terhalang
          const fallbackRes = await fetch(team.logo);
          if (!fallbackRes.ok) throw new Error(`Gagal download logo (${fallbackRes.statusText})`);
          arrayBuffer = await fallbackRes.arrayBuffer();
          contentType = fallbackRes.headers.get("content-type") || "image/png";
        } else {
          arrayBuffer = await imageRes.arrayBuffer();
          contentType = imageRes.headers.get("content-type") || "image/png";
        }

        const buffer = Buffer.from(arrayBuffer);

        // Pengecekan Batas Ukuran File Discord (256 KB)
        if (buffer.length > 256 * 1024) {
          failedCount++;
          details.push(`❌ Gagal ${team.name}: File masih kebesaran (${Math.round(buffer.length / 1024)} KB > 256 KB).`);
          continue;
        }

        const base64Image = `data:${contentType};base64,${buffer.toString('base64')}`;

        // Kirim request ke Discord API
        const res = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'POST', {
          name: validName,
          image: base64Image,
        });

        if (res && res.id) {
          successCount++;
          details.push(`✅ Berhasil: :${validName}: untuk ${team.name}`);
        } else {
          failedCount++;
          const errorMsg = res?.message || (res ? JSON.stringify(res) : "Response kosong dari Discord");
          details.push(`❌ Gagal ${team.name}: ${errorMsg}`);
        }
      } catch (err: any) {
        failedCount++;
        details.push(`❌ Error ${team.name}: ${err?.message || String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: `Total diproses: ${teams.length} | Berhasil: ${successCount} | Gagal/Skipped: ${failedCount}`,
      logs: details,
    });

  } catch (error: any) {
    console.error("API Error create-emojis:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
