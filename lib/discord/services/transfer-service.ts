import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { sendTransferNewsLog } from '../messages/transfer-log';
import { refreshTeamEmbeds } from './transfer-logger';
import {
  PlayerItem,
  TeamKVData,
  FreeDuelistRecord,
  formatDuelId,
  cleanDuelId,
  parsePlayers,
  getTeamBySlug,
  findPlayerIndex,
} from './transfer-types';
import { validateAddAvailability, getConflictingPlayerDetails } from './transfer-validation';

export * from './transfer-types';
export * from './transfer-validation';

async function resolveDiscordId(discordUsername?: string, existingId?: string): Promise<string | null> {
  if (existingId && isValidSnowflake(existingId)) return existingId;
  if (!discordUsername) return null;
  const cleanUsername = discordUsername.trim().toLowerCase().replace(/^@/, '');
  const id = await kv.hget<string>('global:verified_users', cleanUsername);
  return id && isValidSnowflake(id) ? id : null;
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

  refreshTeamEmbeds(teamSlug, teamData, players, quotaUsed).catch((err) =>
    console.error('[REFRESH TEAM EMBEDS ERROR]:', err)
  );
}

// ==========================================
// CORE ACTIONS
// ==========================================

export async function executeTransferOut(teamSlug: string, targetIdentifier: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length <= 5) {
    throw new Error('Roster tim minimal menyisakan 5 pemain. Tidak dapat mengeluarkan pemain lagi.');
  }

  const targetIdx = findPlayerIndex(players, targetIdentifier);
  if (targetIdx === -1) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  const removed = players[targetIdx];
  if (removed.role === 'Ketua' || removed.role === 'Wakil Ketua') {
    throw new Error(`Target masih menjabat sebagai ${removed.role}. Turunkan jabatan ke Anggota terlebih dahulu.`);
  }

  const targetDiscordId = await resolveDiscordId(removed.discord, removed.discordId);

  players.splice(targetIdx, 1);

  const cleanDl = cleanDuelId(removed.idDuelLinks);
  await Promise.all([
    kv.hdel('global:duellinks', cleanDl),
    kv.hdel('global:duellinks', removed.idDuelLinks),
    kv.hdel('global:ign', removed.ign),
    kv.hdel('global:discord', (removed.discord || '').toLowerCase()),
    targetDiscordId ? kv.hdel('global:discord_ids', targetDiscordId) : Promise.resolve(),
  ]);

  const freeRecord: FreeDuelistRecord = {
    discord: removed.discord || '',
    discordId: targetDiscordId || '',
    idDuelLinks: removed.idDuelLinks,
    ign: removed.ign,
    lastTeam: teamSlug,
    releasedAt: new Date().toISOString(),
    teamsJoinedCount: Number(removed.teamsJoinedCount || 1),
  };

  const idKey = targetDiscordId || removed.discord || removed.ign;
  await kv.hset('global:free_duelists', { [idKey]: JSON.stringify(freeRecord) });
  if (removed.ign) await kv.hset('global:free_duelists_ign', { [removed.ign]: idKey });
  if (removed.idDuelLinks) await kv.hset('global:free_duelists_dl', { [removed.idDuelLinks]: idKey });

  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && targetDiscordId) {
    if (teamData.discordRoleId) {
      discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'DELETE').catch((err) =>
        console.error('[REMOVE TEAM ROLE ERROR]:', err)
      );
    }
    discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: null }).catch((err) =>
      console.error('[RESET NICKNAME ERROR]:', err)
    );
  }

  const currentQuota = Number(teamData.transferQuotaUsed || 0);
  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamKode: teamData.kodeTim,
    teamEmojiId: teamData.emojiId,
    teamHex: teamData.warna,
    action: 'OUT',
    targetIgn: removed.ign,
    oldIdDl: removed.idDuelLinks,
  }).catch(console.error);

  return { teamName: teamData.namaTim, removedPlayer: { ...removed, discordId: targetDiscordId || '' }, currentQuota };
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

  const cleanIgn = ign.trim();
  const formattedDl = formatDuelId(rawIdDl);
  const cleanDl = cleanDuelId(rawIdDl);
  if (cleanDl.length !== 9) throw new Error('ID Duel Links harus terdiri dari 9 angka digit.');

  await validateAddAvailability(teamSlug, players, cleanIgn, targetDiscordId, formattedDl, cleanDl);

  const hasDuelistRole = targetRoles.includes(DISCORD_CONFIG.ROLE_DUELIST);
  const freeByDiscordId = await kv.hget<string>('global:free_duelists', targetDiscordId);
  const freeDiscordIdByIgn = await kv.hget<string>('global:free_duelists_ign', cleanIgn);
  const freeDiscordIdByDl = await kv.hget<string>('global:free_duelists_dl', formattedDl);

  let oldRecord: FreeDuelistRecord | null = null;
  let detectedOldKey = targetDiscordId;

  if (freeByDiscordId) {
    oldRecord = typeof freeByDiscordId === 'string' ? JSON.parse(freeByDiscordId) : freeByDiscordId;
    detectedOldKey = targetDiscordId;
  } else if (freeDiscordIdByIgn) {
    const raw = await kv.hget<string>('global:free_duelists', freeDiscordIdByIgn);
    oldRecord = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    detectedOldKey = freeDiscordIdByIgn;
  } else if (freeDiscordIdByDl) {
    const raw = await kv.hget<string>('global:free_duelists', freeDiscordIdByDl);
    oldRecord = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    detectedOldKey = freeDiscordIdByDl;
  }

  const isOldPlayer = hasDuelistRole || !!oldRecord;
  const isPlayoffs = process.env.NEXT_PUBLIC_IS_PLAYOFFS === 'true';
  let currentQuota = Number(teamData.transferQuotaUsed || 0);
  let teamsJoined = 1;

  if (isOldPlayer) {
    if (isPlayoffs) throw new Error('Transfer antar tim dikunci saat Playoffs. Hanya Free Agent murni yang diizinkan.');
    const currentTeamsCount = oldRecord ? Number(oldRecord.teamsJoinedCount || 1) : 1;
    if (currentTeamsCount >= 2) throw new Error('Pemain ini sudah mencapai batas maksimal membela 2 tim berbeda musim ini.');
    if (currentQuota >= 2) throw new Error('Kuota transfer tim Anda sudah habis (Maksimal 2/2 Kuota Transfer).');

    currentQuota += 1;
    teamsJoined = currentTeamsCount + 1;

    if (oldRecord) {
      await kv.hdel('global:free_duelists', detectedOldKey);
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
    if (teamData.discordRoleId) discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
    if (DISCORD_CONFIG.ROLE_DUELIST) discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
    if (DISCORD_CONFIG.ROLE_VERIFIED) discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => null);
    discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: cleanIgn }).catch((err) =>
      console.error('[SET NICKNAME ERROR]:', err)
    );
  }

  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamKode: teamData.kodeTim,
    teamEmojiId: teamData.emojiId,
    teamHex: teamData.warna,
    action: 'ADD',
    targetIgn: cleanIgn,
    newIdDl: formattedDl,
  }).catch(console.error);

  return { teamName: teamData.namaTim, addedPlayer: newPlayer, isOldPlayer, currentQuota };
}

export async function executeTransferEditDl(teamSlug: string, targetIdentifier: string, rawNewIdDl: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  let currentQuota = Number(teamData.transferQuotaUsed || 0);
  if (currentQuota >= 2) throw new Error('Kuota transfer tim Anda sudah habis (Maksimal 2/2 Kuota Transfer).');

  const formattedDl = formatDuelId(rawNewIdDl);
  const cleanDl = cleanDuelId(rawNewIdDl);
  if (cleanDl.length !== 9) throw new Error('ID Duel Links baru harus 9 digit angka.');

  const targetIdx = findPlayerIndex(players, targetIdentifier);
  if (targetIdx === -1) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  const player = players[targetIdx];
  const oldDl = player.idDuelLinks;
  const cleanOldDl = cleanDuelId(oldDl);

  if (cleanDl === cleanOldDl) {
    throw new Error('ID Duel Links baru sama persis dengan ID yang sedang terdaftar.');
  }

  const existingDlTeam = await kv.hget<string>('global:duellinks', cleanDl);
  if (existingDlTeam && existingDlTeam !== teamSlug) {
    const detail = await getConflictingPlayerDetails(existingDlTeam, { dl: cleanDl });
    throw new Error(
      `ID Game **${formattedDl}** sudah dipakai oleh pemain di tim lain:\n• **Tim:** ${detail.teamName}\n• **IGN:** ${detail.ign}\n• **Discord:** ${detail.discord}\n• **ID DL:** ${detail.idDuelLinks}`
    );
  }

  await Promise.all([
    kv.hdel('global:duellinks', cleanOldDl),
    kv.hdel('global:duellinks', oldDl),
  ]);

  player.idDuelLinks = formattedDl;
  await kv.hset('global:duellinks', { [cleanDl]: teamSlug, [formattedDl]: teamSlug });

  currentQuota += 1;
  await updateTeamRoster(key, teamSlug, teamData, players, currentQuota);

  sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamKode: teamData.kodeTim,
    teamEmojiId: teamData.emojiId,
    teamHex: teamData.warna,
    action: 'EDIT_DL',
    targetIgn: player.ign,
    oldIdDl: oldDl,
    newIdDl: formattedDl,
  }).catch(console.error);

  return { teamName: teamData.namaTim, player, oldDl, newDl: formattedDl, currentQuota };
}

export async function executeTransferSetLeader(
  teamSlug: string,
  targetIdentifier: string,
  newRole: 'Ketua' | 'Wakil Ketua',
  actorId: string,
  isAdmin: boolean,
  isKetua: boolean
) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Data tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  const targetIdx = findPlayerIndex(players, targetIdentifier);
  if (targetIdx === -1) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  const targetPlayer = players[targetIdx];
  const targetDiscordId = await resolveDiscordId(targetPlayer.discord, targetPlayer.discordId);

  if (targetDiscordId === actorId || targetPlayer.discord?.toLowerCase() === actorId.toLowerCase()) {
    throw new Error('Anda tidak diperbolehkan mengubah atau memindahkan jabatan Anda sendiri.');
  }

  if (newRole === 'Ketua' && !isAdmin) {
    throw new Error('Hanya Admin Panitia yang memiliki izin untuk mengangkat Ketua Tim baru.');
  }
  if (newRole === 'Wakil Ketua' && !isAdmin && !isKetua) {
    throw new Error('Hanya Ketua Tim atau Admin yang memiliki izin untuk mengangkat Wakil Ketua Tim.');
  }

  players.forEach((p) => {
    if (p.role === newRole) p.role = 'Anggota';
  });

  targetPlayer.role = newRole;

  const ketua = players.find((p) => p.role === 'Ketua');
  const wakil = players.find((p) => p.role === 'Wakil Ketua');
  const anggota = players.filter((p) => p.role === 'Anggota');
  const orderedPlayers = [...(ketua ? [ketua] : []), ...(wakil ? [wakil] : []), ...anggota];

  const currentQuota = Number(teamData.transferQuotaUsed || 0);
  await updateTeamRoster(key, teamSlug, teamData, orderedPlayers, currentQuota);

  sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamKode: teamData.kodeTim,
    teamEmojiId: teamData.emojiId,
    teamHex: teamData.warna,
    action: newRole === 'Ketua' ? 'SET_LEADER' : 'SET_WAKIL',
    targetIgn: targetPlayer.ign,
  }).catch(console.error);

  return { teamName: teamData.namaTim, player: targetPlayer, newRole, currentQuota };
            }
