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
      return NextResponse.json({ error: `Tim "${teamSlug}" tidak ditemukan di database!` }, { status: 404 });
    }

    const players = parsePlayers(teamData.players);

    // Ambil Timestamp CreatedAsli & buat Timestamp Waktu Sekarang
    const createdAt = teamData.createdAt || new Date().toISOString();
    const nowIso = new Date().toISOString();

    // 🔴 SIMPAN UPDATED_AT BARU KE KV REDIS
    const updatesKV: Record<string, any> = {
      updatedAt: nowIso,
    };

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

    // 4. SINKRONISASI INDEX GLOBAL HASH & MEMBER ROLES DISCORD
    let rosterText = "";
    let verifiedCount = 0;

    for (const player of players) {
      const rawIgn = (player.ign || '').trim();
      const rawDl = (player.idDuelLinks || player.duelId || '').trim();
      
      // Bersihkan username discord dari karakter '@'
      const discordUser = (player.discord || '').trim().replace(/^@/, '');
      const discordId = (player.discordId || '').trim();

      // Upsert ke Hash Index Global
      if (rawIgn) await kv.hset('global:ign', { [rawIgn]: teamSlug });
      if (rawDl) await kv.hset('global:duellinks', { [rawDl]: teamSlug });
      if (discordUser) await kv.hset('global:discord', { [discordUser]: teamSlug });
      if (discordId) await kv.hset('global:discord_ids', { [discordId]: teamSlug });

      // 🎯 CEK VERIFIKASI KE HASH 'global:verified_users'
      let isVerified = false;

      if (discordUser) {
        const exists = await kv.hexists('global:verified_users', discordUser);
        if (exists === 1) {
          isVerified = true;
        }
      }

      if (isVerified) {
        verifiedCount++;
      }

      const icon = isVerified ? "✅" : "❌";
      rosterText += `${icon} **${rawIgn || '-'}** (\`@${discordUser || '-'}\`) - *${player.role || 'Player'}*\n`;

      // Assign Discord Role ke Member jika Discord ID tersedia
      if (roleId && discordId) {
        await discordAPI(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`, 'PUT').catch(() => null);
      }
    }

    // 5. UPDATE ATALU SEND EMBED TRACKER DI CHANNEL TIM
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
          // FOOTER DIPAKAIKAN CREATED_AT & UPDATED_AT BARU (nowIso)
          footer: {
            text: getFooterText(createdAt, nowIso)
          }
        }]
      };

      const currentTrackerMsgId = teamData.trackerMsgId;

      if (currentTrackerMsgId) {
        // Coba Edit Message yang Sudah Ada (PATCH)
        const patchRes = await discordAPI(`/channels/${channelId}/messages/${currentTrackerMsgId}`, 'PATCH', trackerEmbedPayload);
        
        // Fallback jika pesan lama hilang/terhapus di Discord
        if (!patchRes) {
          const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbedPayload);
          if (newMsg?.id) {
            updatesKV.trackerMsgId = newMsg.id;
            await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
          }
        }
      } else {
        // Kirim Pesan Baru jika belum ada trackerMsgId
        const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbedPayload);
        if (newMsg?.id) {
          updatesKV.trackerMsgId = newMsg.id;
          await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
        }
      }
    }

    // 6. SIMPAN UPDATED_AT + RECOVERED DATA LAINNYA KE REDIS KV
    await kv.hset(`teams:${teamSlug}`, updatesKV);

    return NextResponse.json({
      success: true,
      message: `Data tim "${teamData.namaTim || teamSlug}" berhasil disinkronkan ke Database Global dan Discord!`,
      stats: {
        totalPlayers: players.length,
        verifiedPlayers: verifiedCount,
        updatedAt: nowIso
      }
    });

  } catch (error: any) {
    console.error('Error Force Sync Team:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
