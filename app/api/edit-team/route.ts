import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from "@/lib/discord/utils";

// ==========================================
// 1. GET: Ambil Data Tim via Token
// ==========================================
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token akses tidak ditemukan!" }, { status: 400 });

  try {
    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) return NextResponse.json({ error: "Token tidak valid/kadaluarsa." }, { status: 404 });

    const teamData = await kv.hgetall(`teams:${teamSlug}`);
    if (!teamData) return NextResponse.json({ error: "Data tim tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ success: true, team: teamData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}

// ==========================================
// 2. POST: Update Data Tim & Patch Discord
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { token, players, namaTim, warna, email } = payload;

    if (!token) return NextResponse.json({ error: "Akses ditolak. Token hilang." }, { status: 400 });

    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) return NextResponse.json({ error: "Sesi edit tidak valid/kadaluarsa." }, { status: 403 });

    const oldTeamData: any = await kv.hgetall(`teams:${teamSlug}`);
    if (!oldTeamData) return NextResponse.json({ error: "Tim tidak ditemukan." }, { status: 404 });

    const oldPlayers = typeof oldTeamData.players === "string" ? JSON.parse(oldTeamData.players) : oldTeamData.players;

    // Logika Array Diffing (Penanganan Duplikat)
    const oldIgns = oldPlayers.map((p: any) => p.ign.toLowerCase());
    const oldDiscords = oldPlayers.map((p: any) => p.discord.toLowerCase());
    const oldDuelIds = oldPlayers.map((p: any) => p.idDuelLinks || p.duelId);

    const newIgns = players.map((p: any) => p.ign.toLowerCase());
    const newDiscords = players.map((p: any) => p.discord.toLowerCase());
    const newDuelIds = players.map((p: any) => p.idDuelLinks || p.duelId);

    const ignsToRemove = oldIgns.filter((ign: string) => !newIgns.includes(ign));
    const discordsToRemove = oldDiscords.filter((d: string) => !newDiscords.includes(d));
    const duelIdsToRemove = oldDuelIds.filter((id: string) => !newDuelIds.includes(id));

    const ignsToAdd = newIgns.filter((ign: string) => !oldIgns.includes(ign));
    const discordsToAdd = newDiscords.filter((d: string) => !oldDiscords.includes(d));
    const duelIdsToAdd = newDuelIds.filter((id: string) => !oldDuelIds.includes(id));

    if (ignsToRemove.length > 0) await kv.srem("global:ign", ...ignsToRemove);
    if (discordsToRemove.length > 0) await kv.srem("global:discord", ...discordsToRemove);
    if (duelIdsToRemove.length > 0) await kv.srem("global:duelId", ...duelIdsToRemove);

    if (ignsToAdd.length > 0) await kv.sadd("global:ign", ...ignsToAdd);
    if (discordsToAdd.length > 0) await kv.sadd("global:discord", ...discordsToAdd);
    if (duelIdsToAdd.length > 0) await kv.sadd("global:duelId", ...duelIdsToAdd);

    // Auto Kick dari Verified jika ada perubahan username discord
    if (discordsToRemove.length > 0) {
      for (const username of discordsToRemove) {
        const discordId = await kv.hget('global:verified_users', username);
        if (discordId) {
          const rolesToRemove = [DISCORD_CONFIG.ROLE_DUELIST, DISCORD_CONFIG.ROLE_KETUA, DISCORD_CONFIG.ROLE_WAKIL];
          if (oldTeamData.discordRoleId) rolesToRemove.push(oldTeamData.discordRoleId);

          const removePromises = rolesToRemove.map(rId => 
            fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${rId}`, {
              method: 'DELETE', headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` }
            })
          );
          await Promise.allSettled(removePromises);
          await kv.hdel('global:verified_users', username);
        }
      }
    }

    const updatedName = namaTim ? namaTim.trim() : oldTeamData.namaTim;
    const updatedColor = warna ? warna.trim() : oldTeamData.warna;
    const updatedEmail = email ? email.trim() : oldTeamData.email;

    // Simpan Pembaruan ke Database
    await kv.hset(`teams:${teamSlug}`, {
      namaTim: updatedName, warna: updatedColor, email: updatedEmail,
      players: JSON.stringify(players), updatedAt: new Date().toISOString()
    });

    // Patch Discord
    const parsedColor = parseInt(updatedColor.replace('#', ''), 16) || 3447003;
    const isNameChanged = oldTeamData.namaTim !== updatedName;
    const isColorChanged = oldTeamData.warna !== updatedColor;

    if ((isNameChanged || isColorChanged) && oldTeamData.discordRoleId) {
      try {
        await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/roles/${oldTeamData.discordRoleId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: updatedName, color: parsedColor })
        });
      } catch (err) { console.error("Gagal update Role:", err); }
    }

    if (oldTeamData.adminMsgId && DISCORD_CONFIG.CH_ROSTER) {
      const ketua = players.find((p: any) => p.role === "Ketua") || players[0];
      const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { ign: "-" };
      const playerListString = players.map((p: any) => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

      const payloadDiscord = {
        embeds: [{
          title: updatedName, color: parsedColor, thumbnail: { url: oldTeamData.logoTim },
          fields: [
            { name: "Ketua", value: ketua?.ign || "-", inline: true },
            { name: "Wakil", value: wakil?.ign || "-", inline: true },
            { name: "Players", value: playerListString, inline: false }
          ]
        }]
      };
      try { await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${oldTeamData.adminMsgId}`, 'PATCH', payloadDiscord); } 
      catch (err) { console.error("Gagal patch Roster:", err); }
    }

    revalidatePath("/admin/dashboard"); 
    return NextResponse.json({ success: true, message: "Perubahan berhasil disimpan!" }); 
    
  } catch (error: any) {
    console.error("Update Team Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal saat update." }, { status: 500 });
  }
  }
