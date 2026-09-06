import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { createCampSuccessEmbed } from '@/lib/discord/messages/transfer-log';
import {
  TransferContext,
  PlayerItem,
  FreeDuelistRecord,
  formatDuelId,
  cleanDuelId,
  parsePlayers,
  resolveDiscordId,
} from './types';
import { validateAddAvailability } from './validation';
import { refreshTeamEmbeds, sendTransferNewsLog, sendAdminAuditLog } from './logger';

export async function handleSubcommandAdd(ctx: TransferContext) {
  const { actorId, actorRoleText, teamSlug, teamName, teamData, opts, interaction } = ctx;

  const rawUser = opts.find((o: any) => o.name === 'user')?.value;
  const ign = opts.find((o: any) => o.name === 'ign')?.value;
  const rawIdDl = opts.find((o: any) => o.name === 'id_dl')?.value;

  if (!rawUser || !ign || !rawIdDl) {
    throw new Error('Option `user`, `ign`, dan `id_dl` wajib diisi!');
  }

  // 1. Resolusi ID Target (Snowflake)
  const resolvedDiscordId = await resolveDiscordId(rawUser);
  if (!resolvedDiscordId) {
    throw new Error(`Akun Discord \`${rawUser}\` belum terverifikasi di sistem TWI. Harap verifikasi terlebih dahulu.`);
  }

  const resolvedUsers = interaction.data?.resolved?.users || {};
  const targetUserData = resolvedUsers[rawUser] || resolvedUsers[resolvedDiscordId] || {};
  const targetUsername = targetUserData.username || rawUser;

  const players = parsePlayers(teamData.players);
  if (players.length >= 10) throw new Error('Roster tim sudah penuh (Maksimal 10 Pemain).');

  const cleanIgn = ign.trim();
  const formattedDl = formatDuelId(rawIdDl);
  const cleanDl = cleanDuelId(rawIdDl);
  if (cleanDl.length !== 9) throw new Error('ID Duel Links harus terdiri dari 9 angka digit.');

  // 2. Validasi Ketersediaan
  await validateAddAvailability(teamSlug, players, cleanIgn, resolvedDiscordId, formattedDl, cleanDl);

  // Ambil role target saat ini di guild
  const guildMemberRes = await discordAPI(
    `/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${resolvedDiscordId}`,
    'GET'
  ).catch(() => null);
  const targetRoles: string[] = guildMemberRes?.roles || [];

  const hasDuelistRole = targetRoles.includes(DISCORD_CONFIG.ROLE_DUELIST);
  const freeByDiscordId = await kv.hget<string>('global:free_duelists', resolvedDiscordId);
  const freeDiscordIdByIgn = await kv.hget<string>('global:free_duelists_ign', cleanIgn);
  const freeDiscordIdByDl = await kv.hget<string>('global:free_duelists_dl', formattedDl);

  let oldRecord: FreeDuelistRecord | null = null;
  let detectedOldKey = resolvedDiscordId;

  if (freeByDiscordId) {
    oldRecord = typeof freeByDiscordId === 'string' ? JSON.parse(freeByDiscordId) : freeByDiscordId;
    detectedOldKey = resolvedDiscordId;
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

  // 3. Aturan Kuota Transfer
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

  // 4. Susun Pemain Baru & Update KV
  const newPlayer: PlayerItem = {
    role: 'Anggota',
    namaLengkap: cleanIgn,
    discord: targetUsername,
    discordId: resolvedDiscordId,
    ign: cleanIgn,
    idDuelLinks: formattedDl,
    teamsJoinedCount: teamsJoined,
  };

  players.push(newPlayer);

  await Promise.all([
    kv.hset('global:duellinks', { [cleanDl]: teamSlug, [formattedDl]: teamSlug }),
    kv.hset('global:ign', { [cleanIgn]: teamSlug }),
    kv.hset('global:discord', { [targetUsername.toLowerCase()]: teamSlug }),
    kv.hset('global:discord_ids', { [resolvedDiscordId]: teamSlug }),
    kv.hset('global:verified_users', { [targetUsername.toLowerCase()]: resolvedDiscordId }),
  ]);

  const nowIso = new Date().toISOString();
  await kv.hset(`teams:${teamSlug}`, {
    players: JSON.stringify(players),
    transferQuotaUsed: currentQuota,
    updatedAt: nowIso,
  });
  teamData.players = players;
  teamData.transferQuotaUsed = currentQuota;
  teamData.updatedAt = nowIso;

  // 5. Eksekusi Role & Nickname Discord API
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const rolesAdded: string[] = [];

  if (guildId && isValidSnowflake(resolvedDiscordId)) {
    if (teamData.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${resolvedDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
      rolesAdded.push(`Role Tim: <@&${teamData.discordRoleId}>`);
    }
    if (DISCORD_CONFIG.ROLE_DUELIST) {
      await discordAPI(`/guilds/${guildId}/members/${resolvedDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
      rolesAdded.push(`Role Duelist: <@&${DISCORD_CONFIG.ROLE_DUELIST}>`);
    }
    if (DISCORD_CONFIG.ROLE_VERIFIED) {
      await discordAPI(`/guilds/${guildId}/members/${resolvedDiscordId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => null);
      rolesAdded.push(`Role Verified: <@&${DISCORD_CONFIG.ROLE_VERIFIED}>`);
    }
    await discordAPI(`/guilds/${guildId}/members/${resolvedDiscordId}`, 'PATCH', { nick: cleanIgn }).catch((err) =>
      console.error('[SET NICKNAME ERROR]:', err)
    );
    rolesAdded.push(`Nickname Server: \`${cleanIgn}\``);
  }

  // 6. Logging & Sync Embed
  refreshTeamEmbeds(teamSlug, teamData, players, currentQuota).catch(console.error);

  sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamKode: teamData.kodeTim,
    teamEmojiId: teamData.emojiId,
    teamHex: teamData.warna,
    action: 'ADD',
    targetIgn: cleanIgn,
    newIdDl: formattedDl,
  }).catch(console.error);

  const statusNote = isOldPlayer ? 'Transfer Pemain Lama (Potong Kuota)' : 'Free Agent Murni (Gratis Kuota)';
  const details = `**Akun:** <@${resolvedDiscordId}>\n**IGN:** ${cleanIgn}\n**ID Duel Links:** ${formattedDl}\n**Status:** ${statusNote}`;

  await sendAdminAuditLog({
    actorId,
    actorRoleText,
    teamSlug,
    teamName,
    subcommand: 'ADD',
    targetUserId: resolvedDiscordId,
    targetIgn: cleanIgn,
    targetDl: formattedDl,
    roleChanges: { added: rolesAdded },
    quotaUsed: currentQuota,
    status: 'SUCCESS',
  });

  return createCampSuccessEmbed(actorId, actorRoleText, 'ADD (Tambah Pemain)', details, currentQuota);
}
