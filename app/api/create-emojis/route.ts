import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config'; // ⚙️ Ambil config dari project

export async function GET() {
  try {
    // 1. Ambil semua data tim dari Vercel KV
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

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    // 2. Loop setiap tim untuk dibuatkan emojinya di Discord
    for (const team of teams) {
      if (!team.logo || !team.logo.startsWith("http")) {
        failedCount++;
        details.push(`Skipped ${team.name}: URL logo tidak valid.`);
        continue;
      }

      try {
        // Download gambar logo
        const imageRes = await fetch(team.logo);
        if (!imageRes.ok) throw new Error("Gagal download gambar dari URL.");
        
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        // Format nama emoji sesuai standar Discord (hanya huruf, angka, underscore min 2 karakter)
        const emojiName = team.name
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .toLowerCase();

        const validName = emojiName.length < 2 ? `t_${emojiName}` : emojiName;

        // 3. Kirim request ke Discord API menggunakan GUILD_ID dari config
        const res = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'POST', {
          name: validName,
          image: base64Image,
        });

        if (res && res.id) {
          successCount++;
          details.push(`Berhasil buat emoji :${validName}: untuk tim ${team.name}`);
        } else {
          failedCount++;
          details.push(`Gagal buat emoji untuk ${team.name}: Batas slot penuh atau nama sudah ada.`);
        }
      } catch (err: any) {
        failedCount++;
        details.push(`Error ${team.name}: ${err.message || err}`);
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
  
