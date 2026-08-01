import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { v2 as cloudinary } from 'cloudinary';

// Konfigurasi Cloudinary (Otomatis membaca env CLOUDINARY_URL / credentials jika ada)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🗜️ Fungsi Kompresi URL Cloudinary
function getOptimizedUrl(originalUrl: string): string {
  try {
    if (originalUrl.includes('res.cloudinary.com')) {
      // Ambil Public ID dari URL Cloudinary
      const parts = originalUrl.split('/upload/');
      if (parts.length === 2) {
        // Hapus prefix transformasi lama jika ada
        const pathAfterUpload = parts[1].replace(/^v\d+\//, '').replace(/^[a-z]_[^/]+\//, '');
        return cloudinary.url(pathAfterUpload, {
          width: 128,
          height: 128,
          crop: 'fill',
          quality: 'auto',
          format: 'png',
          secure: true,
        });
      }
    }
  } catch (e) {
    console.warn("Gagal konversi URL Cloudinary, menggunakan URL asli:", e);
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
        // 🚀 Optimasi URL dengan Cloudinary SDK
        const targetUrl = getOptimizedUrl(team.logo);

        const imageRes = await fetch(targetUrl);
        if (!imageRes.ok) throw new Error("Gagal download gambar logo.");
        
        const contentType = imageRes.headers.get("content-type") || "image/png";
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Cek Batas Ukuran File Discord (256 KB)
        if (buffer.length > 256 * 1024) {
          failedCount++;
          details.push(`❌ Gagal ${team.name}: Ukuran file terlalu besar (${Math.round(buffer.length / 1024)} KB > 256 KB).`);
          continue;
        }

        const base64Image = `data:${contentType};base64,${buffer.toString('base64')}`;

        const res = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'POST', {
          name: validName,
          image: base64Image,
        });

        if (res && res.id) {
          successCount++;
          details.push(`✅ Berhasil: :${validName}: untuk ${team.name}`);
        } else {
          failedCount++;
          const errorMsg = res?.message || JSON.stringify(res);
          details.push(`❌ Gagal ${team.name}: ${errorMsg}`);
        }
      } catch (err: any) {
        failedCount++;
        details.push(`❌ Error ${team.name}: ${err.message || err}`);
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
