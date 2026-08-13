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
  logo?: string;
  logoTim?: string;
  logoUrl?: string;
  players?: string | PlayerItem[];
  discordRoleId?: string;
  discordChannelId?: string;
  trackerMsgId?: string;
  rosterMsgId?: string;
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
    const createdAt = teamData.createdAt || new Date().toISOString();
    const nowIso = new Date().toISOString();

    // Pastikan Logo Terdeteksi (Cek berbagai nama atribut logo yang mungkin dipakai)
    const logoUrl = (teamData.logo || teamData.logoTim || teamData.logoUrl || '').trim();

    // Simpan updatedAt baru ke KV Redis
    const updatesKV: Record<string, any> = {
      updatedAt: nowIso,
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

    // 3. SINKRONISASI INDEX GLOBAL HASH & MEMBER ROLES DISCORD
    let trackerRosterText = "";
    let verifiedCount = 0;

    let ketuaPlayer = players.find((p) => (p.role || '').toLowerCase().includes('ketua') && !(p.role || '').toLowerCase().includes('wakil')) || players[0];
    let wakilPlayer = players.find((p) => (p.role || '').toLowerCase().includes('wakil')) || players[1] || players[0];

    for (const player of players) {
      const rawIgn = (player.ign || '').trim();
      const rawDl = (player.idDuelLinks || player.duelId || '').trim();
      const discordUser = (player.discord || '').trim().replace(/^@/, '');
      const discordId = (player.discordId || '').trim();

      // Upsert ke Hash Global
      if (rawIgn) await kv.hset('global:ign', { [rawIgn]: teamSlug });
      if (rawDl) await kv.hset('global:duellinks', { [rawDl]: teamSlug });
      if (discordUser) await kv.hset('global:discord', { [discordUser]: teamSlug });
      if (discordId) await kv.hset('global:discord_ids', { [discordId]: teamSlug });

      // Cek Verifikasi ke Hash 'global:verified_users'
      let isVerified = false;
      if (discordUser) {
        const exists = await kv.hexists('global:verified_users', discordUser);
        if (exists === 1) isVerified = true;
      }

      if (isVerified) verifiedCount++;

      const icon = isVerified ? "✅" : "❌";
      trackerRosterText += `${icon} **${rawIgn || '-'}** (\`@${discordUser || '-'}\`) - *${player.role || 'Player'}*\n`;

      // Assign Discord Role
      if (roleId && discordId) {
        await discordAPI(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`, 'PUT').catch(() => null);
      }
    }

    // 4. UPDATE / PATCH EMBED TRACKER INTERNAL TIM
    if (channelId) {
      const trackerEmbedPayload = {
        embeds: [{
          title: teamData.namaTim || teamSlug,
          description: `**DAFTAR ROSTER:**\n${trackerRosterText || '*Belum ada roster.*'}`,
          color: hexToDecimal(teamData.warna || '#3b82f6'),
          ...(logoUrl ? { thumbnail: { url: logoUrl } } : {}), // 🔴 LOGO AMAN DENGAN CHECK
          fields: [
            { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : `*(Belum Ada)*`, inline: true },
            { name: "📊 Status Verifikasi", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt, nowIso) }
        }]
      };

      const trackerMsgId = teamData.trackerMsgId;
      if (trackerMsgId) {
        const patchRes = await discordAPI(`/channels/${channelId}/messages/${trackerMsgId}`, 'PATCH', trackerEmbedPayload);
        if (!patchRes) {
          const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbedPayload);
          if (newMsg?.id) {
            updatesKV.trackerMsgId = newMsg.id;
            await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
          }
        }
      } else {
        const newMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', trackerEmbedPayload);
        if (newMsg?.id) {
          updatesKV.trackerMsgId = newMsg.id;
          await discordAPI(`/channels/${channelId}/pins/${newMsg.id}`, 'PUT', {});
        }
      }
    }

    // 5. UPDATE / PATCH EMBED ROSTER GLOBAL DI #team-roster
    const rosterChannelId = DISCORD_CONFIG.CH_ROSTER;
    if (rosterChannelId) {
      const globalPlayerListString = players
        .map((p) => `${p.ign || '-'} (${p.idDuelLinks || p.duelId || '-'})`)
        .join('\n');

      const rosterEmbedPayload = {
        embeds: [{
          title: teamData.namaTim || teamSlug,
          color: hexToDecimal(teamData.warna || '#3b82f6'),
          ...(logoUrl ? { thumbnail: { url: logoUrl } } : {}), // 🔴 AMANIN KEMBALI LOGO ROSTER
          fields: [
            { name: "Ketua", value: ketuaPlayer?.ign || '-', inline: true },
            { name: "Wakil", value: wakilPlayer?.ign || '-', inline: true },
            { name: "Players", value: globalPlayerListString || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt, nowIso) }
        }]
      };

      let rosterMsgId = teamData.rosterMsgId;

      if (!rosterMsgId) {
        try {
          const channelMessages = await discordAPI(`/channels/${rosterChannelId}/messages?limit=100`, 'GET');
          if (Array.isArray(channelMessages)) {
            const existingMsg = channelMessages.find((msg: any) => 
              msg.embeds && 
              msg.embeds[0] && 
              msg.embeds[0].title && 
              msg.embeds[0].title.toLowerCase() === (teamData.namaTim || teamSlug).toLowerCase()
            );
            if (existingMsg) {
              rosterMsgId = existingMsg.id;
            }
          }
        } catch (e) {
          console.warn('Gagal mencari pesan roster eksisting:', e);
        }
      }

      if (rosterMsgId) {
        const patchRosterRes = await discordAPI(`/channels/${rosterChannelId}/messages/${rosterMsgId}`, 'PATCH', rosterEmbedPayload);
        if (patchRosterRes) {
          updatesKV.rosterMsgId = rosterMsgId;
        } else {
          const newRosterMsg = await discordAPI(`/channels/${rosterChannelId}/messages`, 'POST', rosterEmbedPayload);
          if (newRosterMsg?.id) {
            updatesKV.rosterMsgId = newRosterMsg.id;
          }
        }
      } else {
        const newRosterMsg = await discordAPI(`/channels/${rosterChannelId}/messages`, 'POST', rosterEmbedPayload);
        if (newRosterMsg?.id) {
          updatesKV.rosterMsgId = newRosterMsg.id;
        }
      }
    }

    // 6. SIMPAN DATA UPDATED_AT DAN rosterMsgId KE REDIS KV
    await kv.hset(`teams:${teamSlug}`, updatesKV);

    return NextResponse.json({
      success: true,
      message: `Data tim "${teamData.namaTim || teamSlug}" telah berhasil disinkronkan ke Database Global dan Discord.`,
      stats: {
        totalPlayers: players.length,
        verifiedPlayers: verifiedCount,
        syncedAt: nowIso
      }
    });

  } catch (error: any) {
    console.error('Error Force Sync Team:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
    }
      
