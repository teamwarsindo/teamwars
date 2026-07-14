import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { createDiscordRole, createDiscordChannel, createDiscordVoiceChannel } from '@/lib/discord-bot';

export async function POST(req: NextRequest) {
  try {
    const { slugs } = await req.json();
    let results = [];

    for (const teamSlug of slugs) {
      const kvKey = `teams:${teamSlug}`;
      const teamData: any = await kv.hgetall(kvKey);
      if (!teamData) continue;

      if (teamData.discordRoleId) {
        results.push(`⚠️ ${teamData.namaTim}: Aset sudah ada.`);
        continue;
      }

      // 1. EKSEKUSI PEMBUATAN DISCORD ASET (Sama seperti blok discordTasks)
      const roleId = await createDiscordRole(teamData.namaTim, teamData.warna);
      let channelId = "";
      let voiceChannelId = "";

      if (roleId) {
        channelId = await createDiscordChannel(teamData.namaTim, roleId) || "";
        voiceChannelId = await createDiscordVoiceChannel(teamData.namaTim, roleId) || "";
        
        // 2. SIMPAN ID PENTING KE REDIS (Format sama persis dengan sistem asli)
        // Kita tinggalkan field MsgId (Webhook) tetap string kosong, karena webhook tidak dites di sini.
        await kv.hset(kvKey, { 
          discordRoleId: roleId || "",
          discordChannelId: channelId,
          discordVoiceChannelId: voiceChannelId,
          adminMsgId: "",
          financeMsgId: "",
          creativeMsgId: "",
          publicMsgId: ""
        });
        
        results.push(`✅ ${teamData.namaTim}: Role, Text & Voice Channel berhasil dibuat!`);
      } else {
        results.push(`❌ ${teamData.namaTim}: Gagal membuat Role. API Discord error.`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
