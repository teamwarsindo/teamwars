import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function getOptimizedLogoUrl(originalUrl: string): string {
  if (!originalUrl || !originalUrl.startsWith('http')) return originalUrl;

  if (originalUrl.includes('res.cloudinary.com') && originalUrl.includes('/upload/')) {
    return originalUrl.replace('/upload/', '/upload/w_128,h_128,c_fill,q_auto,f_png/');
  }

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
        slug: getTeamSlug(team?.namaTim || team?.name || ''),
        name: team?.namaTim || team?.name || 'Unknown Team',
        kodeTim: team?.kodeTim || team?.name?.substring(0, 4).toLowerCase() || 'team',
        logo: team?.logoTim || team?.logo || '',
        existingEmojiId: team?.emojiId || null,
      }));

    let existingEmojis: any[] = [];
    try {
      existingEmojis = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'GET');
    } catch (e) {
      console.warn("Gagal mengambil daftar emoji eksisting:", e);
    }

    const existingEmojiMap = new Map<string, string>();
    if (Array.isArray(existingEmojis)) {
      existingEmojis.forEach((e) => {
        if (e.name && e.id) existingEmojiMap.set(e.name, e.id);
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (const team of teams) {
      if (!team.logo || !team.logo.startsWith("http")) {
        failedCount++;
        details.push(`⚠️ Skipped ${team.name}: URL logo tidak valid.`);
        continue;
      }

      // Gunakan kodeTim sebagai identifier nama emoji di Discord
      const validName = team.kodeTim.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);

      // 🔄 JIKA EMOJI SUDAH ADA DI DISCORD ➔ Tangkap ID-nya dan pastikan tersimpan di Redis
      if (existingEmojiMap.has(validName)) {
        const foundEmojiId = existingEmojiMap.get(validName)!;
        
        // Update Redis jika emojiId belum tersimpan
        if (!team.existingEmojiId) {
          await kv.hset(`teams:${team.slug}`, { emojiId: foundEmojiId });
          details.push(`ℹ️ Skipped ${team.name}: Emoji :${validName}: sudah ada di Discord. (ID ${foundEmojiId} berhasil ditautkan ke Redis)`);
        } else {
          details.push(`ℹ️ Skipped ${team.name}: Emoji :${validName}: sudah ada di Discord & Redis.`);
        }
        
        failedCount++;
        continue;
      }

      try {
        const optimizedUrl = getOptimizedLogoUrl(team.logo);

        const imageRes = await fetch(optimizedUrl);
        let arrayBuffer: ArrayBuffer;
        let contentType: string;

        if (!imageRes.ok) {
          const fallbackRes = await fetch(team.logo);
          if (!fallbackRes.ok) throw new Error(`Gagal download logo (${fallbackRes.statusText})`);
          arrayBuffer = await fallbackRes.arrayBuffer();
          contentType = fallbackRes.headers.get("content-type") || "image/png";
        } else {
          arrayBuffer = await imageRes.arrayBuffer();
          contentType = imageRes.headers.get("content-type") || "image/png";
        }

        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > 256 * 1024) {
          failedCount++;
          details.push(`❌ Gagal ${team.name}: File masih kebesaran (${Math.round(buffer.length / 1024)} KB > 256 KB).`);
          continue;
        }

        const base64Image = `data:${contentType};base64,${buffer.toString('base64')}`;

        // 🚀 POST Request Buat Emoji ke Discord API
        const res = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'POST', {
          name: validName,
          image: base64Image,
        });

        // 📌 TANGKAP ID EMOJI & SIMPAN KE KV REDIS
        if (res && res.id) {
          await kv.hset(`teams:${team.slug}`, { emojiId: res.id });

          successCount++;
          details.push(`✅ Berhasil: :${validName}: (ID: ${res.id}) tersimpan ke Redis untuk ${team.name}`);
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