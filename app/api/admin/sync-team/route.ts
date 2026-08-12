import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { createDiscordRole } from '@/lib/discord/roles';
import { createDiscordChannel } from '@/lib/discord/channels';

export interface PlayerItem {
  role?: string;
  namaLengkap?: string;
  discord?: string;
  discordId?: string;
  ign?: string;
  idDuelLinks?: string;
  duelId?: string;
  isVerified?: boolean;
}

export interface TeamKVData {
  [key: string]: any;
  id?: string;
  namaTim?: string;
  warna?: string;
  players?: string | PlayerItem[];
  discordRoleId?: string;
  discordChannelId?: string;
  trackerMsgId?: string;
  createdAt?: string;
}

function parsePlayers(playersData: string | PlayerItem[] | undefined): PlayerItem[] {
  if (!playersData) return [];
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { teamSlug } = await req.json();

    if (!teamSlug) {
      return NextResponse.json({ error: 'teamSlug wajib diisi!' }, { status: 400 });
    }

    const guildId = DISCORD_CONFIG.GUILD_ID;
    if (!guildId) {
      return NextResponse.json({ error: 'DISCORD_GUILD_ID tidak dikonfigurasi!' }, { status: 500 });
    }

    // 1. AMBIL DATA TIM DARI KV REDIS
    const teamData = await kv.hgetall<TeamKVData>(`teams:${teamSlug}`);
    if (!teamData) {
      return NextResponse.json({ error: `Tim "${teamSlug}" tidak ditemukan di database!` }, { status: 404 });
    }

    const players = parsePlayers(teamData.players);
    const updatesKV: Record<string, any> = {};

    // 2. SELF-HEALING: BUAT ROLE DENGAN FALLBACK JIKA BELUM ADA
    let roleId = teamData.discordRoleId;
    if (!roleId) {
      roleId = await createDiscordRole(teamData.namaTim || teamSlug, teamData.warna || '#3b82f6');
      if (roleId) {
        updatesKV.discordRoleId = roleId;
      }
    }

    // 3. SELF-HEALING: BUAT TEXT CHANNEL DENGAN FALLBACK JIKA BELUM ADA
    let channelId = teamData.discordChannelId;
    if (!channelId && roleId) {
      channelId = await createDiscordChannel(teamData.namaTim || teamSlug, roleId);
      if (channelId) {
        updatesKV.discordChannelId = channelId;
      }
    }

    // 4. SINKRONISASI INDEX GLOBAL REDIS & ROLE DISCORD MEMBER
    let rolesAssignedCount = 0;

    for (const player of players) {
      const rawIgn = (player.ign || '').trim();
      const rawDl = (player.idDuelLinks || player.duelId || '').trim();
      const discordUser = (player.discord || '').trim();
      const discordId = (player.discordId || '').trim();

      // Indexing Global Hash (Mapping Casing Asli)
      if (rawIgn) await kv.hset('global:ign', { [rawIgn]: teamSlug });
      if (rawDl) await kv.hset('global:duellinks', { [rawDl]: teamSlug });
      if (discordUser) await kv.hset('global:discord', { [discordUser]: teamSlug });
      if (discordId) await kv.hset('global:discord_ids', { [discordId]: teamSlug });

      // Assign Discord Role ke Member
      if (roleId && discordId) {
        try {
          // Cek apakah member sudah punya role tersebut untuk cegah redundant API call
          const member = await discordAPI(`/guilds/${guildId}/members/${discordId}`, 'GET');
          if (member && Array.isArray(member.roles)) {
            if (!member.roles.includes(roleId)) {
              const assigned = await discordAPI(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`, 'PUT');
              if (assigned) rolesAssignedCount++;
            }
          }
        } catch (err) {
          console.warn(`Gagal assign role ke Discord ID ${discordId}:`, err);
        }
      }
    }

    // 5. UPDATE ATALU SEND EMBED TRACKER DI CHANNEL TIM (Satu Embed Saja)
    if (channelId) {
      let rosterText = "";
      let verifiedCount = 0;

      players.forEach((p) => {
        if (p.isVerified) verifiedCount++;
        const icon = p.isVerified ? "✅" : "❌";
        rosterText += `${icon} **${p.ign || '-'}** (\`@${p.discord || '-'}\`) - *${p.role || 'Player'}*\n`;
      });

      const trackerEmbed = {
        embeds: [{
          title: teamData.namaTim || teamSlug,
          description: `**DAFTAR ROSTER:**\n${rosterText || '*Belum ada roster.*'}`,
          color: parseInt((teamData.warna || '#3b82f6').replace('#', ''), 16) || 3447003,
          fields: [
            { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : `*(Belum Ada)*`, inline: true },
            { name: "📊 Status Verifikasi", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
          ],
          footer: { text: `Last Synced: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` }
        }]
      };

      let currentTrackerMsgId = teamData.trackerMsgId;

      if (currentTrackerMsgId) {
        // Coba Edit Message yang Sudah Ada (PATCH)
        const patchRes = await discordAPI(`/channels/${channelId}/messages/${currentTrackerMsgId}`, 'PATCH', trackerEmbed);
        
        // Jika pesan lama tidak ditemukan (404/null), buat pesan baru
        if (!patchRes) {
          const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbed);
          if (newMsg?.id) {
            updatesKV.trackerMsgId = newMsg.id;
            await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
          }
        }
      } else {
        // Kirim Pesan Baru jika belum pernah diset (POST)
        const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbed);
        if (newMsg?.id) {
          updatesKV.trackerMsgId = newMsg.id;
          await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
        }
      }
    }

    // 6. SIMPAN RECOVERED DATA BACK TO REDIS (Jika ada pembaruan roleId/channelId/trackerMsgId)
    if (Object.keys(updatesKV).length > 0) {
      await kv.hset(`teams:${teamSlug}`, updatesKV);
    }

    return NextResponse.json({
      success: true,
      message: `Data tim "${teamData.namaTim || teamSlug}" berhasil disinkronkan total!`,
      stats: {
        totalPlayers: players.length,
        rolesAssigned: rolesAssignedCount,
      }
    });

  } catch (error: any) {
    console.error('Error Force Sync Team:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
