import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const TEAM_SLUG = "test-octagram"; // 🔒 KUNCI MATI: TIDAK BISA MENGHAPUS TIM LAIN
  const kvKey = `teams:${TEAM_SLUG}`;

  if (!token || !guildId) return NextResponse.json({ error: "Missing Env" }, { status: 500 });

  try {
    const teamData: any = await kv.hgetall(kvKey);
    
    if (!teamData) {
      return NextResponse.json({ message: "Tidak ada data tim testing yang perlu dihapus." });
    }

    const { discordRoleId, discordChannelId, discordVoiceChannelId, editToken } = teamData;
    let log = [];

    // 1. Hapus Text Channel
    if (discordChannelId) {
      const res = await fetch(`https://discord.com/api/v10/channels/${discordChannelId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bot ${token}` }
      });
      log.push(`Text Channel: ${res.ok ? 'Terhapus' : 'Gagal'}`);
    }

    // 2. Hapus Voice Channel
    if (discordVoiceChannelId) {
      const res = await fetch(`https://discord.com/api/v10/channels/${discordVoiceChannelId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bot ${token}` }
      });
      log.push(`Voice Channel: ${res.ok ? 'Terhapus' : 'Gagal'}`);
    }

    // 3. Hapus Role
    if (discordRoleId) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${discordRoleId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bot ${token}` }
      });
      log.push(`Role: ${res.ok ? 'Terhapus' : 'Gagal'}`);
    }

    // 4. Bersihkan Redis Database
    await kv.del(kvKey); // Hapus brankas tim
    await kv.del(`token:map:${editToken}`); // Hapus map token
    await kv.srem("global:teams", TEAM_SLUG); // Cabut dari list global tim

    log.push("Data KV Redis: Terhapus");

    return NextResponse.json({ 
      success: true, 
      message: `Pembersihan berhasil untuk tim ${TEAM_SLUG}`,
      details: log
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ success: false, error: "Gagal melakukan cleanup" }, { status: 500 });
  }
                                                                      }
