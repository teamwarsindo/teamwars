import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { formatDuelId, parsePlayers, getTeamPrefix } from '../utils/transfer-helpers';
import { sendTransferNewsLog, refreshTeamEmbeds } from './transfer-logger';

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId?: string;
  ign: string;
  idDuelLinks: string;
}

export interface TeamKVData {
  [key: string]: any;
  namaTim: string;
  warna: string;
  logoTim?: string;
  createdAt?: string;
  updatedAt?: string;
  discordRoleId?: string;
  discordChannelId?: string;
  trackerMsgId?: string;
  adminMsgId?: string;
  transferQuotaUsed?: number;
  kodeTim?: string;
  emojiId?: string;
  players: string | PlayerItem[];
}

export async function getTeamBySlug(slug: string): Promise<{ key: string; data: TeamKVData } | null> {
  const key = `teams:${slug}`;
  const data = await kv.hgetall<TeamKVData>(key);
  if (!data || !data.namaTim) return null;
  return { key, data };
}

async function updateTeamRoster(
  key: string,
  teamSlug: string,
  teamData: TeamKVData,
  players: PlayerItem[],
  quotaUsed?: number
) {
  const nowIso = new Date().toISOString();
  const updateData: any = { players: JSON.stringify(players), updatedAt: nowIso };
  if (quotaUsed !== undefined) updateData.transferQuotaUsed = quotaUsed;

  await kv.hset(key, updateData);
  teamData.updatedAt = nowIso;
  await refreshTeamEmbeds(teamSlug, teamData, players, quotaUsed);
}

// ----------------------------------------------------
// CORE TRANSFER ACTIONS
// ----------------------------------------------------

export async function executeTransferOut(teamSlug: string, targetDiscordUsername: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length <= 5) {
    throw new Error('Gagal Transfer! Roster tim tidak boleh kurang dari 5 pemain.');
  }

  const targetIdx = players.findIndex(
    (p) => p.discord.toLowerCase() === targetDiscordUsername.toLowerCase() || p.ign.toLowerCase() === targetDiscordUsername.toLowerCase()
  );
  if (targetIdx === -1) {
    throw new Error('Pemain tidak ditemukan di roster tim ini!');
  }

  const removed = players[targetIdx];
  if (removed.role === 'Ketua') throw new Error('Gagal Transfer! Ketua Tim tidak dapat dikeluarkan.');
  if (removed.role === 'Wakil Ketua') throw new Error(`Gagal Transfer! **${removed.ign}** adalah Wakil Ketua.`);

  // 🟢 FALLBACK LOOKUP DISCORD ID DARI CORE VERIFIED USERS
  let targetDiscordId = removed.discordId;

  if (!targetDiscordId && removed.discord) {
    const usernameClean = removed.discord.trim().toLowerCase();
    targetDiscordId = (await kv.hget<string>('global:verified_users', usernameClean)) || undefined;
  }

  // Hapus pemain dari array roster
  players.splice(targetIdx, 1);

  // Hapus mapping tim pemain dari global maps
  await Promise.all([
    kv.hdel('global:ign', removed.ign),
    kv.hdel('global:duellinks', removed.idDuelLinks),
    kv.hdel('global:discord', removed.discord.toLowerCase()),
    targetDiscordId ? kv.hdel('global:discord_ids', targetDiscordId) : Promise.resolve(),
  ]);

  // Simpan data ke Pool Free Agent / Free Duelist (Lengkap dengan Discord ID jika ketemu)
  const freeDuelistKey = `global:free_duelists:${removed.discord.toLowerCase()}`;
  const existingFreeDuelist = await kv.hgetall<any>(freeDuelistKey);
  const currentJoinedCount = existingFreeDuelist?.teamsJoinedCount || 1;

  await kv.hset(freeDuelistKey, {
    ign: removed.ign,
    idDuelLinks: removed.idDuelLinks,
    discord: removed.discord,
    discordId: targetDiscordId || '', // 👈 Terisi presisi jika terverifikasi
    teamsJoinedCount: currentJoinedCount,
    lastTeam: teamSlug,
    releasedAt: new Date().toISOString(),
  });

  // Cabut Role Tim di Server Discord
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && targetDiscordId && teamData.discordRoleId) {
    await discordAPI(
      `/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`,
      'DELETE'
    ).catch(() => null);
  }

  // Update DB Tim
  await updateTeamRoster(key, teamSlug, teamData, players);

  // Kirim Log Berita Transfer OUT
  const prefix = getTeamPrefix(teamData);
  await sendTransferNewsLog(
    teamData.warna,
    `**${removed.ign}** (**${removed.idDuelLinks}**) telah dikeluarkan dari roster tim ${prefix}**${teamData.namaTim}**`
  );

  return { teamName: teamData.namaTim, removedIgn: removed.ign };
}

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
  if (players.length >= 10) throw new Error('Gagal Transfer! Roster tim sudah maksimal 10 pemain.');

  const cleanIgn = ign.trim();
  const formattedDl = formatDuelId(rawIdDl);
  if (formattedDl.replace(/\D/g, '').length !== 9) throw new Error('Gagal Transfer! ID Game harus 9 digit.');

  const currentQuota = teamData.transferQuotaUsed || 0;

  // Cek duplikasi di global maps
  const [existingIgn, existingDl, existingDiscord] = await Promise.all([
    kv.hget<string>('global:ign', cleanIgn),
    kv.hget<string>('global:duellinks', formattedDl),
    kv.hget<string>('global:discord', targetUsername.toLowerCase()),
  ]);

  if (existingIgn) throw new Error(`Gagal! IGN **${cleanIgn}** sudah terdaftar.`);
  if (existingDl) throw new Error(`Gagal! ID Game **${formattedDl}** sudah terdaftar.`);
  if (existingDiscord) throw new Error(`Gagal! Discord **${targetUsername}** sudah terdaftar.`);

  players.push({
    role: 'Anggota',
    namaLengkap: cleanIgn,
    discord: targetUsername,
    discordId: targetDiscordId,
    ign: cleanIgn,
    idDuelLinks: formattedDl,
  });

  // Simpan Mapping Global
  await Promise.all([
    kv.hset('global:ign', { [cleanIgn]: teamSlug }),
    kv.hset('global:duellinks', { [formattedDl]: teamSlug }),
    kv.hset('global:discord', { [targetUsername.toLowerCase()]: teamSlug }),
    kv.hset('global:discord_ids', { [targetDiscordId]: teamSlug }),
    kv.hset('global:verified_users', { [targetUsername.toLowerCase()]: targetDiscordId }),
  ]);

  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && isValidSnowflake(targetDiscordId)) {
    if (teamData.discordRoleId) await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
    if (DISCORD_CONFIG.ROLE_DUELIST) await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
    if (DISCORD_CONFIG.ROLE_VERIFIED) await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => null);
    await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: cleanIgn }).catch(() => null);
  }

  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  const prefix = getTeamPrefix(teamData);
  await sendTransferNewsLog(
    teamData.warna,
    `**${cleanIgn}** (**${formattedDl}**) telah ditambahkan ke roster tim ${prefix}**${teamData.namaTim}**`
  );

  return { teamName: teamData.namaTim, addedIgn: cleanIgn, currentQuota };
}

export async function executeTransferEditDl(teamSlug: string, targetUsername: string, rawNewIdDl: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  let currentQuota = teamData.transferQuotaUsed || 0;
  if (currentQuota >= 2) throw new Error('Gagal Edit ID! Kuota transfer habis (Maksimal 2x).');

  const formattedDl = formatDuelId(rawNewIdDl);
  if (formattedDl.replace(/\D/g, '').length !== 9) throw new Error('Gagal! ID Game harus 9 digit.');

  const player = players.find((p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase());
  if (!player) throw new Error('Pemain tidak ditemukan!');

  const oldDl = player.idDuelLinks;
  const existingDlTeam = await kv.hget<string>('global:duellinks', formattedDl);
  if (existingDlTeam && existingDlTeam !== teamSlug) throw new Error(`Gagal! ID Game **${formattedDl}** sudah dipakai.`);

  if (player.idDuelLinks) await kv.hdel('global:duellinks', player.idDuelLinks);
  player.idDuelLinks = formattedDl;
  await kv.hset('global:duellinks', { [formattedDl]: teamSlug });

  currentQuota += 1;
  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  const prefix = getTeamPrefix(teamData);
  await sendTransferNewsLog(
    teamData.warna,
    `**${player.ign}** dari tim ${prefix}**${teamData.namaTim}** telah mengganti ID Game dari ${oldDl} menjadi **${formattedDl}**`
  );

  return { teamName: teamData.namaTim, ign: player.ign, newDl: formattedDl, currentQuota };
}

export async function executeTransferSetLeader(teamSlug: string, targetUsername: string, newRole: 'Ketua' | 'Wakil Ketua', isExecutedByAdmin: boolean) {
  if (newRole === 'Ketua' && !isExecutedByAdmin) throw new Error('❌ Khusus Admin!');

  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  const targetIdx = players.findIndex((p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase());
  if (targetIdx === -1) throw new Error('Pemain tidak ditemukan!');

  const oldLeader = players.find((p) => p.role === newRole);
  if (oldLeader) oldLeader.role = 'Anggota';

  players[targetIdx].role = newRole;

  const ketua = players.find((p) => p.role === 'Ketua');
  const wakil = players.find((p) => p.role === 'Wakil Ketua');
  const anggota = players.filter((p) => p.role === 'Anggota');

  const orderedPlayers = [...(ketua ? [ketua] : []), ...(wakil ? [wakil] : []), ...anggota];

  const guildId = DISCORD_CONFIG.GUILD_ID;
  const newLeader = players[targetIdx];

  if (guildId) {
    const targetRoleDiscordId = newRole === 'Ketua' ? DISCORD_CONFIG.ROLE_KETUA : DISCORD_CONFIG.ROLE_WAKIL;
    if (oldLeader?.discordId && targetRoleDiscordId) await discordAPI(`/guilds/${guildId}/members/${oldLeader.discordId}/roles/${targetRoleDiscordId}`, 'DELETE').catch(() => null);
    if (newLeader.discordId && targetRoleDiscordId) await discordAPI(`/guilds/${guildId}/members/${newLeader.discordId}/roles/${targetRoleDiscordId}`, 'PUT').catch(() => null);
  }

  await updateTeamRoster(key, teamSlug, teamData, orderedPlayers);

  const prefix = getTeamPrefix(teamData);
  await sendTransferNewsLog(
    teamData.warna,
    `Tim ${prefix}**${teamData.namaTim}** telah mengganti jabatan **${newRole}** ke **${newLeader.ign}**`
  );

  return { teamName: teamData.namaTim, ign: newLeader.ign, newRole };
}