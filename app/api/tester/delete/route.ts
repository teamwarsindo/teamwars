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

      // ==========================================
      // 1. HAPUS ASET DI DISCORD (Jika sudah generate)
      // ==========================================
      if (token) {
        // Hapus Role
        if (teamData.discordRoleId && guildId) {
          await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${teamData.discordRoleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bot ${token}` }
          }).catch(console.error);
        }
        // Hapus Text Channel
        if (teamData.discordChannelId) {
          await fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bot ${token}` }
          }).catch(console.error);
        }
        // Hapus Voice Channel
        if (teamData.discordVoiceChannelId) {
          await fetch(`https://discord.com/api/v10/channels/${teamData.discordVoiceChannelId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bot ${token}` }
          }).catch(console.error);
        }
      }

      // ==========================================
      // 2. BERSIHKAN DATA DI VERCEL KV (REDIS)
      // ==========================================
      
      // Hapus dari daftar tim global
      await kv.srem("global:teams", slug);
      
      // Hapus index username (discord & ign)
      if (teamData.players) {
        try {
          const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
          const igns = players.map((p: any) => p.ign?.toLowerCase()).filter(Boolean);
          const discords = players.map((p: any) => p.discord?.toLowerCase()).filter(Boolean);
          if (igns.length) await kv.srem("global:ign", ...igns);
          if (discords.length) await kv.srem("global:discord", ...discords);
        } catch(e) { console.error("Gagal parse pemain:", e) }
      }

      // Hapus mapping edit token
      if (teamData.editToken) {
        await kv.del(`token:map:${teamData.editToken}`);
      }

      // Hapus dari global summary list
      const rawSummary: any = await kv.get("global:summary_list");
      if (Array.isArray(rawSummary)) {
        const newSummary = rawSummary.filter((s: any) => s.teamSlug !== slug);
        await kv.set("global:summary_list", JSON.stringify(newSummary));
      }

      // Hapus brankas utama tim
      await kv.del(kvKey);

      results.push(`🗑️ ${teamData.namaTim}: Berhasil dihapus total (DB & Discord)!`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
