import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { createDiscordRole, createDiscordChannel, createDiscordVoiceChannel } from '@/lib/discord-bot';

const ROLE_DUELIST = '1525761725901570158'; // ID Role Season 6

export async function POST(req: NextRequest) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !token) {
      return NextResponse.json({ success: false, error: "Bot Token atau Guild ID belum di-setting!" });
    }

    const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

    // ==========================================
    // 1. TARIK SEMUA DATA DARI DISCORD (Members, Roles, Channels)
    // ==========================================
    
    // A. Fetch Members (Untuk cari user ID)
    let allMembers: any[] = [];
    let after = "0";
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`, { method: 'GET', headers });
      if (!res.ok) return NextResponse.json({ success: false, error: "Gagal fetch Members dari Discord." });
      const members = await res.json();
      if (members.length === 0) { hasMore = false; } else {
        allMembers.push(...members);
        after = members[members.length - 1].user.id;
        if (members.length < 1000) hasMore = false;
      }
    }
    const verifiedMembers = allMembers.filter((m: any) => m.roles.includes(ROLE_DUELIST));

    // B. Fetch Semua Roles di Server
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { method: 'GET', headers });
    const serverRoles = await rolesRes.json();

    // C. Fetch Semua Channels di Server
    const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { method: 'GET', headers });
    const serverChannels = await channelsRes.json();

    // ==========================================
    // 2. PROSES COCOK-LOGI & PENYEMBUHAN DATABASE
    // ==========================================
    const allTeamSlugs = await kv.smembers('global:teams');
    let syncLog = [];
    let mapToSave: Record<string, string> = {}; 
    let idsToSave: string[] = []; 

    for (const slug of allTeamSlugs) {
      const kvKey = `teams:${slug}`;
      const teamData: any = await kv.hgetall(kvKey);
      if (!teamData) continue;

      let isDbUpdated = false;
      const namaTim = teamData.namaTim;
      const expectedTextChannelName = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

      // ----------------------------------------
      // A. AUTO-HEAL ASET DISCORD (Role & Channels)
      // ----------------------------------------
      
      // 1. Cek & Heal Role
      if (!teamData.discordRoleId) {
        const existingRole = serverRoles.find((r: any) => r.name.toLowerCase() === namaTim.toLowerCase());
        if (existingRole) {
          teamData.discordRoleId = existingRole.id;
          syncLog.push(`🔍 Ditemukan Role Lama: ${namaTim}`);
        } else {
          teamData.discordRoleId = await createDiscordRole(namaTim, teamData.warna || '#FFFFFF');
          syncLog.push(`✨ Buat Role Baru: ${namaTim}`);
        }
        isDbUpdated = true;
      }

      // 2. Cek & Heal Text Channel
      if (!teamData.discordChannelId && teamData.discordRoleId) {
        const existingText = serverChannels.find((c: any) => c.type === 0 && c.name === expectedTextChannelName);
        if (existingText) {
          teamData.discordChannelId = existingText.id;
          syncLog.push(`🔍 Ditemukan Text Channel: ${namaTim}`);
        } else {
          teamData.discordChannelId = await createDiscordChannel(namaTim, teamData.discordRoleId);
          syncLog.push(`✨ Buat Text Channel Baru: ${namaTim}`);
        }
        isDbUpdated = true;
      }

      // 3. Cek & Heal Voice Channel
      if (!teamData.discordVoiceChannelId && teamData.discordRoleId) {
        // Voice channel nama aslinya bisa ada spasinya, tipe = 2
        const existingVoice = serverChannels.find((c: any) => c.type === 2 && c.name.toLowerCase() === namaTim.toLowerCase());
        if (existingVoice) {
          teamData.discordVoiceChannelId = existingVoice.id;
          syncLog.push(`🔍 Ditemukan Voice Channel: ${namaTim}`);
        } else {
          teamData.discordVoiceChannelId = await createDiscordVoiceChannel(namaTim, teamData.discordRoleId);
          syncLog.push(`✨ Buat Voice Channel Baru: ${namaTim}`);
        }
        isDbUpdated = true;
      }

      // ----------------------------------------
      // B. AUTO-HEAL PEMAIN (Sinkronisasi ID)
      // ----------------------------------------
      if (teamData.players) {
        const playersArray = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
        let isPlayerUpdated = false;

        for (const member of verifiedMembers) {
          const discordUsername = member.user.username.toLowerCase();
          const discordId = member.user.id;

          const pIndex = playersArray.findIndex((p: any) => p.discord.trim().toLowerCase() === discordUsername);
          if (pIndex > -1 && !playersArray[pIndex].discordId) {
            playersArray[pIndex].discordId = discordId;
            mapToSave[discordId] = slug;
            idsToSave.push(discordId);
            isPlayerUpdated = true;
            syncLog.push(`👤 User Disinkron: ${discordUsername} -> ${namaTim}`);
          }
        }

        if (isPlayerUpdated) {
          teamData.players = JSON.stringify(playersArray);
          isDbUpdated = true;
        }
      }

      // ----------------------------------------
      // C. SAVE KEMBALI KE REDIS JIKA ADA PERUBAHAN
      // ----------------------------------------
      if (isDbUpdated) {
        // Format teamData sudah lengkap (adminMsgId, buktiTransfer dll tidak tersentuh/aman)
        await kv.hset(kvKey, teamData);
      }
    }

    // ==========================================
    // 3. UPDATE INDEX GLOBAL (Laci Hash Besar)
    // ==========================================
    if (idsToSave.length > 0) {
      await kv.hset('global:discord_map', mapToSave);
      await kv.sadd('global:discord_ids', ...idsToSave);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Penyembuhan Database Selesai!`,
      log: syncLog 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
