import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { sendTransferNewsLog } from '@/lib/discord/messages/transfer-log';
import { sendRosterMessage } from '@/lib/discord/messages/roster';
import { sendTeamTracker } from '@/lib/discord/messages/tracker';

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId?: string;
  ign: string;
  idDuelLinks: string;
}

export interface TeamKVData {
  namaTim: string;
  warna: string;
  logoTim?: string;
  createdAt?: string;
  discordRoleId?: string;
  discordChannelId?: string;
  trackerMsgId?: string;
  adminMsgId?: string;
  transferQuotaUsed?: number;
  players: string | PlayerItem[];
}

/**
 * Helper Format ID Duel Links (123456789 -> 123-456-789)
 */
export function formatDuelId(input: string): string {
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 9) return input.trim();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
}

/**
 * Helper Ambil Data Tim dari Slug
 */
export async function getTeamBySlug(slug: string): Promise<{ key: string; data: TeamKVData } | null> {
  const key = `teams:${slug}`;
  const data = await kv.hgetall<TeamKVData>(key);
  if (!data || !data.namaTim) return null;
  return { key, data };
}

/**
 * Helper Parse Array Players
 */
export function parsePlayers(playersData: string | PlayerItem[]): PlayerItem[] {
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

/**
 * Helper Refresh Embed CH_ROSTER dan Match Camp Tracker
 */
export async function refreshTeamEmbeds(teamSlug: string, teamData: TeamKVData, players: PlayerItem[]) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const createdAt = teamData.createdAt || new Date().toISOString();
  const ketua = players.find((p) => p.role === 'Ketua') || { ign: '-' };
  const wakil = players.find((p) => p.role === 'Wakil Ketua') || { ign: '-' };

  // 1. Update/PATCH Embed CH_ROSTER
  if (teamData.adminMsgId && DISCORD_CONFIG.CH_ROSTER) {
    const playerListString = players.map((p) => `${p.ign} (${p.idDuelLinks})`).join('\n');
    const rosterPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          color: parseInt((teamData.warna || '#00a8fc').replace('#', ''), 16),
          thumbnail: teamData.logoTim ? { url: teamData.logoTim } : undefined,
          fields: [
            { name: 'Ketua', value: ketua.ign, inline: true },
            { name: 'Wakil', value: wakil.ign, inline: true },
            { name: 'Players', value: playerListString, inline: false },
          ],
        },
      ],
    };
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${teamData.adminMsgId}`, 'PATCH', rosterPayload).catch(() => null);
  }

  // 2. Update/PATCH Embed Match Camp Tracker
  if (teamData.trackerMsgId && teamData.discordChannelId) {
    let rosterText = '';
    players.forEach((p) => {
      rosterText += `❌ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
    });

    const trackerPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          description: `**DAFTAR ROSTER:**\n${rosterText}`,
          color: parseInt((teamData.warna || '#00a8fc').replace('#', ''), 16),
          fields: [
            { name: '📌 Role Tim', value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: '📊 Status', value: `**0 / ${players.length}** Terverifikasi`, inline: true },
          ],
        },
      ],
    };
    await discordAPI(`/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, 'PATCH', trackerPayload).catch(() => null);
  }
}

// ----------------------------------------------------
// CORE TRANSFER ACTIONS
// ----------------------------------------------------

/**
 * 1. TRANSFER OUT (Keluarkan Pemain)
 */
export async function executeTransferOut(teamSlug: string, targetDiscordUsername: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length <= 5) {
    throw new Error('Gagal Transfer! Roster tim tidak boleh kurang dari 5 pemain.');
  }

  const targetIdx = players.findIndex((p) => p.discord.toLowerCase() === targetDiscordUsername.toLowerCase() || p.ign.toLowerCase() === targetDiscordUsername.toLowerCase());
  if (targetIdx === -1) {
    throw new Error('Pemain tidak ditemukan di roster tim ini!');
  }

  const removedPlayer = players[targetIdx];

  // Hapus dari roster
  players.splice(targetIdx, 1);

  // Update KV Global Hashes (Hapus pemetaan aktif)
  await Promise.all([
    kv.hdel('global:ign', removedPlayer.ign.toLowerCase()),
    kv.hdel('global:duellinks', removedPlayer.idDuelLinks),
    kv.hdel('global:discord', removedPlayer.discord.toLowerCase()),
    removedPlayer.discordId ? kv.hdel('global:discord_ids', removedPlayer.discordId) : Promise.resolve(),
  ]);

  // Simpan ke Free Agents Global Pool
  await kv.hset(`global:free_agents:${removedPlayer.discord.toLowerCase()}`, {
    ign: removedPlayer.ign,
    idDuelLinks: removedPlayer.idDuelLinks,
    discord: removedPlayer.discord,
    discordId: removedPlayer.discordId || '',
    lastTeam: teamSlug,
    releasedAt: new Date().toISOString(),
  });

  // Cabut Role Tim dari Discord
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && removedPlayer.discordId && teamData.discordRoleId) {
    await discordAPI(`/guilds/${guildId}/members/${removedPlayer.discordId}/roles/${teamData.discordRoleId}`, 'DELETE').catch(() => null);
  }

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players) });
  await refreshTeamEmbeds(teamSlug, teamData, players);
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, action: 'OUT', targetIgn: removedPlayer.ign });

  return { teamName: teamData.namaTim, removedIgn: removedPlayer.ign };
}

/**
 * 2. TRANSFER ADD (Masukkan Pemain Baru / Global)
 */
export async function executeTransferAdd(params: {
  teamSlug: string;
  targetDiscordId: string;
  targetUsername: string;
  ign: string;
  rawIdDl: string;
}) {
  const { teamSlug, targetDiscordId, targetUsername, ign, rawIdDl } = params;

  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length >= 10) {
    throw new Error('Gagal Transfer! Roster tim sudah mencapai batas maksimal 10 pemain.');
  }

  const cleanIgn = ign.trim();
  const formattedDl = formatDuelId(rawIdDl);

  // Validasi Format ID DL (Wajib 9 Digit)
  if (formattedDl.replace(/\D/g, '').length !== 9) {
    throw new Error('Gagal Transfer! ID Duel Links harus terdiri dari 9 digit angka.');
  }

  // Pengecekan Duplikasi Global
  const [existingIgnTeam, existingDlTeam, existingDiscordTeam] = await Promise.all([
    kv.hget<string>('global:ign', cleanIgn.toLowerCase()),
    kv.hget<string>('global:duellinks', formattedDl),
    kv.hget<string>('global:discord', targetUsername.toLowerCase()),
  ]);

  if (existingIgnTeam) {
    const t = await getTeamBySlug(existingIgnTeam);
    throw new Error(`Gagal Transfer! IGN **${cleanIgn}** sudah terdaftar di tim **${t?.data.namaTim || existingIgnTeam}**.`);
  }

  if (existingDlTeam) {
    const t = await getTeamBySlug(existingDlTeam);
    throw new Error(`Gagal Transfer! ID Duel Links **${formattedDl}** sudah terdaftar atas nama **${cleanIgn}** di tim **${t?.data.namaTim || existingDlTeam}**.`);
  }

  if (existingDiscordTeam) {
    const t = await getTeamBySlug(existingDiscordTeam);
    throw new Error(`Gagal Transfer! Akun Discord **${targetUsername}** sudah terdaftar atas nama **${cleanIgn}** di tim **${t?.data.namaTim || existingDiscordTeam}**.`);
  }

  // Cek Status Free Agent (Transfer dari Global)
  const freeAgent = await kv.hgetall<any>(`global:free_agents:${targetUsername.toLowerCase()}`);
  let currentQuota = teamData.transferQuotaUsed || 0;

  if (freeAgent && freeAgent.ign) {
    if (currentQuota >= 2) {
      throw new Error('Gagal Transfer! Tim sudah mencapai batas maksimal 2x transfer pemain dari Global Pool.');
    }
    currentQuota += 1;
    await kv.del(`global:free_agents:${targetUsername.toLowerCase()}`);
  }

  // Buat Objek Player Baru
  const newPlayer: PlayerItem = {
    role: 'Anggota',
    namaLengkap: cleanIgn,
    discord: targetUsername,
    discordId: targetDiscordId,
    ign: cleanIgn,
    idDuelLinks: formattedDl,
  };

  players.push(newPlayer);

  // Update Global Hashes
  await Promise.all([
    kv.hset('global:ign', { [cleanIgn.toLowerCase()]: teamSlug }),
    kv.hset('global:duellinks', { [formattedDl]: teamSlug }),
    kv.hset('global:discord', { [targetUsername.toLowerCase()]: teamSlug }),
    kv.hset('global:discord_ids', { [targetDiscordId]: teamSlug }),
  ]);

  // Aksi Discord API (Pasang Role Tim, Role Duelist, Set Nickname)
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && isValidSnowflake(targetDiscordId)) {
    if (teamData.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
    }
    if (DISCORD_CONFIG.ROLE_DUELIST) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
    }
    // Set Nickname Server ke IGN Baru
    await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: cleanIgn }).catch(() => null);
  }

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players), transferQuotaUsed: currentQuota });
  await refreshTeamEmbeds(teamSlug, teamData, players);
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, action: 'ADD', targetIgn: cleanIgn });

  return { teamName: teamData.namaTim, addedIgn: cleanIgn };
}

/**
 * 3. TRANSFER EDIT DL (Ganti ID Duel Links)
 */
export async function executeTransferEditDl(teamSlug: string, targetUsername: string, rawNewIdDl: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  const formattedDl = formatDuelId(rawNewIdDl);
  if (formattedDl.replace(/\D/g, '').length !== 9) {
    throw new Error('Gagal Transfer! ID Duel Links harus terdiri dari 9 digit angka.');
  }

  const player = players.find((p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase());
  if (!player) throw new Error('Pemain tidak ditemukan di roster tim ini!');

  // Cek duplikasi ID DL baru
  const existingDlTeam = await kv.hget<string>('global:duellinks', formattedDl);
  if (existingDlTeam && existingDlTeam !== teamSlug) {
    const t = await getTeamBySlug(existingDlTeam);
    throw new Error(`Gagal Transfer! ID Duel Links **${formattedDl}** sudah terdaftar atas nama **${player.ign}** di tim **${t?.data.namaTim || existingDlTeam}**.`);
  }

  // Hapus ID lama, daftarkan ID baru ke Global
  if (player.idDuelLinks) await kv.hdel('global:duellinks', player.idDuelLinks);
  player.idDuelLinks = formattedDl;
  await kv.hset('global:duellinks', { [formattedDl]: teamSlug });

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players) });
  await refreshTeamEmbeds(teamSlug, teamData, players);
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, action: 'EDIT_DL', targetIgn: player.ign, newIdDl: formattedDl });

  return { teamName: teamData.namaTim, ign: player.ign, newDl: formattedDl };
}

/**
 * 4. TRANSFER SET LEADER / WAKIL (Khusus Admin)
 */
export async function executeTransferSetLeader(teamSlug: string, targetUsername: string, newRole: 'Ketua' | 'Wakil Ketua') {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  const targetIdx = players.findIndex((p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase());
  if (targetIdx === -1) throw new Error('Pemain tidak ditemukan di roster tim ini!');

  const oldLeader = players.find((p) => p.role === newRole);
  if (oldLeader) oldLeader.role = 'Anggota';

  players[targetIdx].role = newRole;

  const guildId = DISCORD_CONFIG.GUILD_ID;
  const newLeaderPlayer = players[targetIdx];

  // Aksi Pindah Role Discord (Ketua / Wakil)
  if (guildId) {
    const targetRoleDiscordId = newRole === 'Ketua' ? DISCORD_CONFIG.ROLE_KETUA : DISCORD_CONFIG.ROLE_WAKIL;

    // Cabut dari leader lama
    if (oldLeader?.discordId && targetRoleDiscordId) {
      await discordAPI(`/guilds/${guildId}/members/${oldLeader.discordId}/roles/${targetRoleDiscordId}`, 'DELETE').catch(() => null);
    }
    // Pasang ke leader baru
    if (newLeaderPlayer.discordId && targetRoleDiscordId) {
      await discordAPI(`/guilds/${guildId}/members/${newLeaderPlayer.discordId}/roles/${targetRoleDiscordId}`, 'PUT').catch(() => null);
    }
  }

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players) });
  await refreshTeamEmbeds(teamSlug, teamData, players);
  await sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamHex: teamData.warna,
    action: newRole === 'Ketua' ? 'SET_LEADER' : 'SET_WAKIL',
    targetIgn: newLeaderPlayer.ign,
  });

  return { teamName: teamData.namaTim, ign: newLeaderPlayer.ign, newRole };
}