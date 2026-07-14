import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  try {
    const { slugs } = await req.json();
    const guildId = process.env.DISCORD_GUILD_ID;
    const token = process.env.DISCORD_BOT_TOKEN;

    let results = [];

    for (const slug of slugs) {
      const kvKey = `teams:${slug}`;
      const teamData: any = await kv.hgetall(kvKey);
      
      if (!teamData) {
        results.push(`⚠️ ${slug}: Data tidak ditemukan di DB.`);
        continue;
      }

      if (token) {
        // ==========================================
        // FITUR BARU: BACKUP TEXT CHANNEL
        // ==========================================
        if (teamData.discordChannelId) {
          try {
            const msgRes = await fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}/messages?limit=100`, {
              method: 'GET',
              headers: { 'Authorization': `Bot ${token}` }
            });

            if (msgRes.ok) {
              const messages = await msgRes.json();
              // Format ulang pesan biar lebih rapi saat disimpan
              const backupData = messages.map((m: any) => ({
                author: m.author.username,
                content: m.content,
                timestamp: m.timestamp
              })).reverse(); // Balik urutan biar dari yang terlama ke terbaru
              
              const backupKey = `backup:channels:${slug}:${Date.now()}`;
              await kv.set(backupKey, JSON.stringify(backupData));
              console.log(`[BACKUP] Sukses backup ${messages.length} pesan ke ${backupKey}`);
            } else {
              console.error(`[BACKUP ERROR] Gagal akses pesan:`, await msgRes.text());
            }
          } catch (e) {
            console.error(`[BACKUP EXCEPTION]:`, e);
          }
        }

        // ==========================================
        // HAPUS ASET DI DISCORD (MODE NGEBUT / PARALLEL)
        // ==========================================
        const deletePromises = [];

        // Siapkan antrean hapus Role
        if (teamData.discordRoleId && guildId) {
          deletePromises.push(
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${teamData.discordRoleId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bot ${token}` }
            }).then(async res => { if (!res.ok) console.error(`[ROLE ERR]`, await res.text()) })
          );
        }

        // Siapkan antrean hapus Text Channel
        if (teamData.discordChannelId) {
          deletePromises.push(
            fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bot ${token}` }
            }).then(async res => { if (!res.ok) console.error(`[TEXT ERR]`, await res.text()) })
          );
        }

        // Siapkan antrean hapus Voice Channel
        if (teamData.discordVoiceChannelId) {
          deletePromises.push(
            fetch(`https://discord.com/api/v10/channels/${teamData.discordVoiceChannelId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bot ${token}` }
            }).then(async res => { if (!res.ok) console.error(`[VOICE ERR]`, await res.text()) })
          );
        }

        // Eksekusi semuanya secara serentak dalam 1 detik!
        await Promise.allSettled(deletePromises);
      }

      // ==========================================
      // BERSIHKAN DATA DI VERCEL KV (REDIS)
      // ==========================================
      await kv.srem("global:teams", slug);
      
      if (teamData.players) {
        try {
          const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
          const igns = players.map((p: any) => p.ign?.toLowerCase()).filter(Boolean);
          const discords = players.map((p: any) => p.discord?.toLowerCase()).filter(Boolean);
          if (igns.length) await kv.srem("global:ign", ...igns);
          if (discords.length) await kv.srem("global:discord", ...discords);
        } catch(e) {}
      }

      if (teamData.editToken) await kv.del(`token:map:${teamData.editToken}`);

      const rawSummary: any = await kv.get("global:summary_list");
      if (Array.isArray(rawSummary)) {
        const newSummary = rawSummary.filter((s: any) => s.teamSlug !== slug);
        await kv.set("global:summary_list", JSON.stringify(newSummary));
      }

      await kv.del(kvKey);
      results.push(`🗑️ ${teamData.namaTim}: Berhasil di-backup & dihapus total!`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
