import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { sendTransferNewsLog } from '../messages/transfer-log';
import { refreshTeamEmbeds } from './transfer-logger';

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId: string;
  ign: string;
  idDuelLinks: string;
  teamsJoinedCount?: number;
}

export interface TeamKVData {
  [key: string]: unknown;
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

export interface FreeDuelistRecord {
  [key: string]: unknown;
  discord: string;
  discordId: string;
  idDuelLinks: string;
  ign: string;
  lastTeam: string;
  releasedAt: string;
  teamsJoinedCount: number;
}

export function formatDuelId(input: string): string {
  if (!input) return '-';
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 9) return input.trim();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
}

export function cleanDuelId(input: string): string {
  return (input || '').replace(/\D/g, '');
}

export function parsePlayers(playersData: any): PlayerItem[] {
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
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
// CORE ACTIONS
// ----------------------------------------------------

export async function executeTransferOut(teamSlug: string, targetDiscordId: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length <= 5) {
    throw new Error('Roster tim minimal menyisakan 5 pemain. Tidak dapat mengeluarkan pemain lagi.');
  }

  const targetIdx = players.findIndex((p) => p.discordId === targetDiscordId);
  if (targetIdx === -1) {
    throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');
  }

  const removed = players[targetIdx];
  if (removed.role === 'Ketua' || removed.role === 'Wakil Ketua') {
    throw new Error(`Target masih menjabat sebagai ${removed.role}. Turunkan jabatan ke Anggota terlebih dahulu.`);
  }

  players.splice(targetIdx, 1);

  const cleanDl = cleanDuelId(removed.idDuelLinks);
  await Promise.all([
    kv.hdel('global:duellinks', cleanDl),
    kv.hdel('global:duellinks', removed.idDuelLinks),
    kv.hdel('global:ign', removed.ign),
    kv.hdel('global:discord', removed.discord.toLowerCase()),
    kv.hdel('global:discord_ids', removed.discordId),
  ]);

  const freeRecord: FreeDuelistRecord = {
    discord: removed.discord,
    discordId: removed.discordId,
    idDuelLinks: removed.idDuelLinks,
    ign: removed.ign,
    lastTeam: teamSlug,
    releasedAt: new Date().toISOString(),
    teamsJoinedCount: Number(removed.teamsJoinedCount || 1),
  };

  await kv.hset('global:free_duelists', { [removed.discordId]: JSON.stringify(freeRecord) });
  if (removed.ign) await kv.hset('global:free_duelists_ign', { [removed.ign]: removed.discordId });
  if (removed.idDuelLinks) await kv.hset('global:free_duelists_dl', { [removed.idDuelLinks]: removed.discordId });

  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && removed.discordId) {
    if (teamData.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${removed.discordId}/roles/${teamData.discordRoleId}`, 'DELETE').catch(() => null);
    }
    await discordAPI(`/guilds/${guildId}/members/${removed.discordId}`, 'PATCH', { nick: null }).catch(() => null);
  }

  await updateTeamRoster(key, teamSlug, teamData, players);

  await sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamHex: teamData.warna,
    action: 'OUT',
    targetIgn: removed.ign,
  });

  return {
    teamName: teamData.namaTim,
    removedPlayer: removed,
    currentQuota: teamData.transferQuotaUsed || 0,
  };
}

export async function executeTransferAdd(params: {
  teamSlug: string;
  targetDiscordId: string;
  targetUsername: string;
  ign: string;
  rawIdDl: string;
  targetRoles: string[];
}) {
  const { teamSlug, targetDiscordId, targetUsername, ign, rawIdDl, targetRoles } = params;
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length >= 10) throw new Error('Roster tim sudah penuh (Maksimal 10 Pemain).');
  if (players.some((p) => p.discordId === targetDiscordId)) throw new Error('Pemain ini sudah terdaftar di roster tim Anda.');

  const cleanIgn = ign.trim();
  const formattedDl = formatDuelId(rawIdDl);
  const cleanDl = cleanDuelId(rawIdDl);
  if (cleanDl.length !== 9) throw new Error('ID Duel Links harus terdiri dari 9 angka digit.');

  const hasDuelistRole = targetRoles.includes(DISCORD_CONFIG.ROLE_DUELIST);
  const freeByDiscordId = await kv.hget<string>('global:free_duelists', targetDiscordId);
  const freeDiscordIdByIgn = await kv.hget<string>('global:free_duelists_ign', cleanIgn);
  const freeDiscordIdByDl = await kv.hget<string>('global:free_duelists_dl', formattedDl);

  let oldRecord: FreeDuelistRecord | null = null;
  let detectedOldDiscordId = targetDiscordId;

  if (freeByDiscordId) {
    oldRecord = typeof freeByDiscordId === 'string' ? JSON.parse(freeByDiscordId) : freeByDiscordId;
    detectedOldDiscordId = targetDiscordId;
  } else if (freeDiscordIdByIgn) {
    const raw = await kv.hget<string>('global:free_duelists', freeDiscordIdByIgn);
    oldRecord = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    detectedOldDiscordId = freeDiscordIdByIgn;
  } else if (freeDiscordIdByDl) {
    const raw = await kv.hget<string>('global:free_duelists', freeDiscordIdByDl);
    oldRecord = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    detectedOldDiscordId = freeDiscordIdByDl;
  }

  const isOldPlayer = hasDuelistRole || !!oldRecord;
  const isPlayoffs = process.env.NEXT_PUBLIC_IS_PLAYOFFS === 'true';
  let currentQuota = teamData.transferQuotaUsed || 0;
  let teamsJoined = 1;

  if (isOldPlayer) {
    if (isPlayoffs) throw new Error('Transfer antar tim dikunci saat Playoffs. Hanya Free Agent murni yang diizinkan.');
    const currentTeamsCount = oldRecord ? Number(oldRecord.teamsJoinedCount || 1) : 1;
    if (currentTeamsCount >= 2) throw new Error('Pemain ini sudah mencapai batas maksimal membela 2 tim berbeda musim ini.');
    if (currentQuota >= 2) throw new Error('Kuota transfer tim Anda sudah habis (Maksimal 2/2 Kuota Transfer).');

    currentQuota += 1;
    teamsJoined = currentTeamsCount + 1;

    if (oldRecord) {
      await kv.hdel('global:free_duelists', detectedOldDiscordId);
      if (oldRecord.ign) await kv.hdel('global:free_duelists_ign', oldRecord.ign);
      if (oldRecord.idDuelLinks) await kv.hdel('global:free_duelists_dl', oldRecord.idDuelLinks);
    }
  }

  const newPlayer: PlayerItem = {
    role: 'Anggota',
    namaLengkap: cleanIgn,
    discord: targetUsername,
    discordId: targetDiscordId,
    ign: cleanIgn,
    idDuelLinks: formattedDl,
    teamsJoinedCount: teamsJoined,
  };

  players.push(newPlayer);

  await Promise.all([
    kv.hset('global:duellinks', { [cleanDl]: teamSlug, [formattedDl]: teamSlug }),
    kv.hset('global:ign', { [cleanIgn]: teamSlug }),
    kv.hset('global:discord', { [targetUsername.toLowerCase()]: teamSlug }),
    kv.hset('global:discord_ids', { [targetDiscordId]: teamSlug }),
    kv.hset('global:verified_users', { [targetUsername.toLowerCase()]: targetDiscordId }),
  ]);

  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && isValidSnowflake(targetDiscordId)) {
    if (teamData.discordRoleId) await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
    if (DISCORD_CONFIG.ROLE_DUELIST) await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
    if (DISCORD_CONFIG.ROLE_VERIFIED) await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => null);
    const tagPrefix = teamData.kodeTim ? `[${teamData.kodeTim}] ` : '';
    await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: `${tagPrefix}${cleanIgn}` }).catch(() => null);
  }

  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  await sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamHex: teamData.warna,
    action: 'ADD',
    targetIgn: cleanIgn,
  });

  return {
    teamName: teamData.namaTim,
    addedPlayer: newPlayer,
    isOldPlayer,
    currentQuota,
  };
}

export async function executeTransferEditDl(teamSlug: string, targetDiscordId: string, rawNewIdDl: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  let currentQuota = teamData.transferQuotaUsed || 0;
  if (currentQuota >= 2) throw new Error('Kuota transfer tim Anda sudah habis (Maksimal 2/2 Kuota Transfer).');

  const formattedDl = formatDuelId(rawNewIdDl);
  const cleanDl = cleanDuelId(rawNewIdDl);
  if (cleanDl.length !== 9) throw new Error('ID Duel Links baru harus 9 digit angka.');

  const player = players.find((p) => p.discordId === targetDiscordId);
  if (!player) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  const oldDl = player.idDuelLinks;
  const cleanOldDl = cleanDuelId(oldDl);

  if (cleanDl === cleanOldDl) throw new Error('ID Duel Links baru sama persis dengan ID yang sedang terdaftar.');

  const existingDlTeam = await kv.hget<string>('global:duellinks', cleanDl);
  if (existingDlTeam && existingDlTeam !== teamSlug) throw new Error(`ID Game **${formattedDl}** sudah dipakai oleh pemain lain.`);

  await Promise.all([
    kv.hdel('global:duellinks', cleanOldDl),
    kv.hdel('global:duellinks', oldDl),
  ]);

  player.idDuelLinks = formattedDl;
  await kv.hset('global:duellinks', { [cleanDl]: teamSlug, [formattedDl]: teamSlug });

  currentQuota += 1;
  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  await sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamHex: teamData.warna,
    action: 'EDIT_DL',
    targetIgn: player.ign,
    newIdDl: formattedDl,
  });

  return {
    teamName: teamData.namaTim,
    player,
    oldDl,
    newDl: formattedDl,
    currentQuota,
  };
}

export async function executeTransferSetLeader(
  teamSlug: string,
  targetDiscordId: string,
  newRole: 'Ketua' | 'Wakil Ketua',
  actorId: string,
  isAdmin: boolean,
  isKetua: boolean
) {
  if (targetDiscordId === actorId) throw new Error('Anda tidak diperbolehkan mengubah atau memindahkan jabatan Anda sendiri.');

  if (newRole === 'Ketua' && !isAdmin) throw new Error('Hanya Admin Panitia yang memiliki izin untuk mengangkat Ketua Tim baru.');
  if (newRole === 'Wakil Ketua' && !isAdmin && !isKetua) throw new Error('Hanya Ketua Tim atau Admin yang memiliki izin untuk mengangkat Wakil Ketua Tim.');

  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  const targetIdx = players.findIndex((p) => p.discordId === targetDiscordId);
  if (targetIdx === -1) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  players.forEach((p) => {
    if (p.role === newRole) p.role = 'Anggota';
  });

  players[targetIdx].role = newRole;

  const ketua = players.find((p) => p.role === 'Ketua');
  const wakil = players.find((p) => p.role === 'Wakil Ketua');
  const anggota = players.filter((p) => p.role === 'Anggota');
  const orderedPlayers = [...(ketua ? [ketua] : []), ...(wakil ? [wakil] : []), ...anggota];

  await updateTeamRoster(key, teamSlug, teamData, orderedPlayers);

  const newLeader = players[targetIdx];
  await sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamHex: teamData.warna,
    action: newRole === 'Ketua' ? 'SET_LEADER' : 'SET_WAKIL',
    targetIgn: newLeader.ign,
  });

  return {
    teamName: teamData.namaTim,
    player: newLeader,
    newRole,
    currentQuota: teamData.transferQuotaUsed || 0,
  };
}
