import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, getFooterText, hexToDecimal } from '@/lib/discord/utils';
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
  updatedAt?: string;
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

    // 1. AMBIL DATA TIM SPESIFIK DARI KV REDIS
    const teamData = await kv.hgetall<TeamKVData>(`teams:${teamSlug}`);
    if (!teamData) {
      return NextResponse.json({ error: `Tim "${teamSlug}" tidak ditemukan di DB!` }, { status: 404 });
    }

    const players = parsePlayers(teamData.players);

    // Ambil Timestamp Created & Updated Asli dari KV
    const createdAt = teamData.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString(); // Set updated time ke sekarang karena baru di-sync
    
    const updatesKV: Record<string, any> = {
      updatedAt: updatedAt,
    };

    // 2. SELF-HEALING: ROLE & CHANNEL DISCORD
    let roleId = teamData.discordRoleId;
    if (!roleId) {
      roleId = await createDiscordRole(teamData.namaTim || teamSlug, teamData.warna || '#3b82f6');
      if (roleId) updatesKV.discordRoleId = roleId;
    }

    let channelId = teamData.discordChannelId;
    if (!channelId && roleId) {
      channelId = await createDiscordChannel(teamData.namaTim || teamSlug, roleId);
      if (channelId) updatesKV.discordChannelId = channelId;
    }

    // 3. SINKRONISASI INDEX GLOBAL HASH & MEMBER ROLES
    let rosterText = "";
    let verifiedCount = 0;

    for (const player of players) {
      const rawIgn = (player.ign || '').trim();
      const rawDl = (player.idDuelLinks || player.duelId || '').trim();
      const discordUser = (player.discord || '').trim();
      const discordId = (player.discordId || '').trim();

      // Upsert ke Hash Index Global
      if (rawIgn) await kv.hset('global:ign', { [rawIgn]: teamSlug });
      if (rawDl) await kv.hset('global:duellinks', { [rawDl]: teamSlug });
      if (discordUser) await kv.hset('global:discord', { [discordUser]: teamSlug });
      if (discordId) await kv.hset('global:discord_ids', { [discordId]: teamSlug });

      // 🔍 CEK STATUS VERIFIKASI DARI REDIS HASH `global:verified`
      let isVerified = false;
      if (rawIgn) {
        const verifiedRecord = await kv.hexists('global:verified', rawIgn);
        if (verifiedRecord === 1) isVerified = true;
      }
      if (!isVerified && discordId) {
        const verifiedRecordByDiscord = await kv.hexists('global:verified', discordId);
        if (verifiedRecordByDiscord === 1) isVerified = true;
      }

      if (isVerified) verifiedCount++;

      const icon = isVerified ? "✅" : "❌";
      rosterText += `${icon} **${rawIgn || '-'}** (\`@${discordUser || '-'}\`) - *${player.role || 'Player'}*\n`;

      // Assign Discord Role ke Member
      if (roleId && discordId) {
        await discordAPI(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`, 'PUT').catch(() => null);
      }
    }

    // 4. UPDATE EMBED TRACKER DI CHANNEL TIM
    if (channelId) {
      const trackerEmbedPayload = {
        embeds: [{
          title: teamData.namaTim || teamSlug,
          description: `**DAFTAR ROSTER:**\n${rosterText || '*Belum ada roster.*'}`,
          color: hexToDecimal(teamData.warna || '#3b82f6'),
          fields: [
            { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : `*(Belum Ada)*`, inline: true },
            { name: "📊 Status Verifikasi", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
          ],
          // 🔴 FOOTER MENGIKUTI FORMAT ASLI 'getFooterText' DENGAN DATA DARI KV
          footer: {
            text: getFooterText(createdAt, updatedAt)
          }
        }]
      };

      const trackerMsgId = teamData.trackerMsgId;

      if (trackerMsgId) {
        // PATCH (Edit Pesan Lama)
        const patchRes = await discordAPI(`/channels/${channelId}/messages/${trackerMsgId}`, 'PATCH', trackerEmbedPayload);
        
        // Fallback jika pesan lama hilang
        if (!patchRes) {
          const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbedPayload);
          if (newMsg?.id) {
            updatesKV.trackerMsgId = newMsg.id;
            await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
          }
        }
      } else {
        // POST Baru jika belum ada trackerMsgId
        const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbedPayload);
        if (newMsg?.id) {
          updatesKV.trackerMsgId = newMsg.id;
          await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
        }
      }
    }

    // 5. UPDATE DATA RECOVERED & UPDATED_AT KE KV REDIS
    await kv.hset(`teams:${teamSlug}`, updatesKV);

    return NextResponse.json({
      success: true,
      message: `Data tim "${teamData.namaTim || teamSlug}" berhasil disinkronkan!`,
      stats: {
        totalPlayers: players.length,
        verifiedPlayers: verifiedCount
      }
    });

  } catch (error: any) {
    console.error('Error Force Sync Team:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
  }
  
