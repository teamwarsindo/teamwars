import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { createDiscordRole, createDiscordChannel, createDiscordVoiceChannel } from '@/lib/discord-bot';

const ROLE_DUELIST = '1525761725901570158'; 

export async function POST(req: NextRequest) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !token) {
      return NextResponse.json({ success: false, error: "Bot Token atau Guild ID belum di-setting!" });
    }

    const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

    // ==========================================
    // 1. TARIK SEMUA DATA DARI DISCORD
    // ==========================================
    let allMembers: any[] = [];
    let after = "0";
    let hasMore = true;
    
    while (hasMore) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`, { method: 'GET', headers });
      if (!res.ok) return NextResponse.json({ success: false, error: `Gagal fetch Members: ${res.statusText}` });
      const members = await res.json();
      
      if (members.length === 0) { 
        hasMore = false; 
      } else {
        allMembers.push(...members);
        after = members[members.length - 1].user.id;
        if (members.length < 1000) hasMore = false;
      }
    }
    
    // Filter user dengan Role Season 7
    const verifiedMembers = allMembers.filter((m: any) => m.roles.includes(ROLE_DUELIST));

    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { method: 'GET', headers });
    const serverRoles = await rolesRes.json();

    const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { method: 'GET', headers });
    const serverChannels = await channelsRes.json();

    // ==========================================
    // 2. PROSES FORCE-SYNC & PENYEMBUHAN DATABASE
    // ==========================================
    const allTeamSlugs = await kv.smembers('global:teams');
    let syncLog: string[] = [];
    let mapToSave: Record<string, string> = {}; 
    let idsToSave: string[] = []; 

    for (const slug of allTeamSlugs) {
      const kvKey = `teams:${slug}`;
      const teamData: any = await kv.hgetall(kvKey);
      if (!teamData) continue;

      let isDbUpdated = false;
      const namaTim = teamData.namaTim;
      const expectedTextChannelName = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

      // --- Cek & Heal Aset ---
      if (!teamData.discordRoleId) {
        const existingRole = serverRoles.find((r: any) => r.name.toLowerCase() === namaTim.toLowerCase());
        if (existingRole) { teamData.discordRoleId = existingRole.id; syncLog.push(`🔍 Role Disinkron: ${namaTim}`); } 
        else { teamData.discordRoleId = await createDiscordRole(namaTim, teamData.warna || '#FFFFFF'); syncLog.push(`✨ Role Dibuat: ${namaTim}`); }
        isDbUpdated = true;
      }

      if (!teamData.discordChannelId && teamData.discordRoleId) {
        const existingText = serverChannels.find((c: any) => c.type === 0 && c.name === expectedTextChannelName);
        if (existingText) { teamData.discordChannelId = existingText.id; syncLog.push(`🔍 Text Ch Disinkron: ${namaTim}`); } 
        else { teamData.discordChannelId = await createDiscordChannel(namaTim, teamData.discordRoleId); syncLog.push(`✨ Text Ch Dibuat: ${namaTim}`); }
        isDbUpdated = true;
      }

      if (!teamData.discordVoiceChannelId && teamData.discordRoleId) {
        const existingVoice = serverChannels.find((c: any) => c.type === 2 && c.name.toLowerCase() === namaTim.toLowerCase());
        if (existingVoice) { teamData.discordVoiceChannelId = existingVoice.id; syncLog.push(`🔍 Voice Ch Disinkron: ${namaTim}`); } 
        else { teamData.discordVoiceChannelId = await createDiscordVoiceChannel(namaTim, teamData.discordRoleId); syncLog.push(`✨ Voice Ch Dibuat: ${namaTim}`); }
        isDbUpdated = true;
      }

      // --- AUTO-HEAL & OVERWRITE PEMAIN ---
      if (teamData.players) {
        const playersArray = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
        let isPlayerUpdated = false;

        for (const member of verifiedMembers) {
          // Bersihkan username dari spasi dan tanda "@" untuk amannya
          const discordUsername = member.user.username.replace(/^@/, '').trim().toLowerCase();
          const discordId = member.user.id;

          const pIndex = playersArray.findIndex((p: any) => p.discord.replace(/^@/, '').trim().toLowerCase() === discordUsername);
          
          if (pIndex > -1) {
            // Overwrite jika beda ATAU jika sama tapi tetap ingin memastikan logic jalan
            if (playersArray[pIndex].discordId !== discordId) {
                playersArray[pIndex].discordId = discordId;
                mapToSave[discordId] = slug;
                idsToSave.push(discordId);
                isPlayerUpdated = true;
                syncLog.push(`🔄 User ID Diperbarui: ${discordUsername} -> ${namaTim}`);
            }
          }
        }

        if (isPlayerUpdated) {
          teamData.players = JSON.stringify(playersArray);
          isDbUpdated = true;
        }
      }

      if (isDbUpdated) {
        await kv.hset(kvKey, teamData);
      }
    }

    // ==========================================
    // 3. UPDATE INDEX GLOBAL SECARA AMAN
    // ==========================================
    if (idsToSave.length > 0) {
      await kv.hset('global:discord_map', mapToSave);
      await kv.sadd('global:discord_ids', ...idsToSave);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Penyembuhan & Sinkronisasi Selesai!`,
      debug: {
          totalMembersFetched: allMembers.length,
          verifiedMembersFound: verifiedMembers.length,
          totalTeamsChecked: allTeamSlugs.length
      },
      log: syncLog 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Tambahkan ini agar tidak error 405 saat API dibuka paksa di Browser
export async function GET(req: NextRequest) {
    return POST(req);
      }
