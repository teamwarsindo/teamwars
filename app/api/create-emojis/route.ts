import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import sharp from 'sharp'; // 🛠️ Auto resize gambar murni di server Node.js

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
        // 1. Download Gambar Asli
        const imageRes = await fetch(team.logo);
        if (!imageRes.ok) throw new Error("Gagal download gambar logo.");
        
        const arrayBuffer = await imageRes.arrayBuffer();
        const rawBuffer = Buffer.from(arrayBuffer);

        // 2. 🗜️ RESIZE & KOMPRES DENGAN SHARP (Pasti < 50 KB & 128x128px)
        const compressedBuffer = await sharp(rawBuffer)
          .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ compressionLevel: 9, quality: 80 })
          .toBuffer();

        // 3. Ubah ke Base64 Data URI
        const base64Image = `data:image/png;base64,${compressedBuffer.toString('base64')}`;

        // 4. Kirim ke Discord API
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
