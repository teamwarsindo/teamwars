import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { createCampSuccessEmbed } from '@/lib/discord/messages/transfer-log';
import {
  TransferContext,
  FreeDuelistRecord,
  cleanDuelId,
  parsePlayers,
  findPlayerIndex,
  resolveDiscordId,
} from './types';
import { refreshTeamEmbeds, sendTransferNewsLog, sendAdminAuditLog } from './logger';

export async function handleSubcommandOut(ctx: TransferContext) {
  const { actorId, actorRoleText, teamSlug, teamName, teamData, opts } = ctx;

  const rawUser = opts.find((o: any) => o.name === 'user')?.value;
  if (!rawUser) throw new Error('Option `user` wajib diisi!');

  const players = parsePlayers(teamData.players);
  if (players.length <= 5) {
    throw new Error('Roster tim minimal menyisakan 5 pemain. Tidak dapat mengeluarkan pemain lagi.');
  }

  const targetIdx = findPlayerIndex(players, rawUser);
  if (targetIdx === -1) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  const removed = players[targetIdx];
  if (removed.role === 'Ketua' || removed.role === 'Wakil Ketua') {
    throw new Error(`Target masih menjabat sebagai ${removed.role}. Turunkan jabatan ke Anggota terlebih dahulu.`);
  }

  // Resolusi ID Snowflake target
  const targetDiscordId = await resolveDiscordId(removed.discord, removed.discordId);

  players.splice(targetIdx, 1);

  // Bersihkan index global
  const cleanDl = cleanDuelId(removed.idDuelLinks);
  await Promise.all([
    kv.hdel('global:duellinks', cleanDl),
    kv.hdel('global:duellinks', removed.idDuelLinks),
    kv.hdel('global:ign', removed.ign),
    kv.hdel('global:discord', (removed.discord || '').toLowerCase()),
    targetDiscordId ? kv.hdel('global:discord_ids', targetDiscordId) : Promise.resolve(),
  ]);

  // Simpan record ke free duelists
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

  // Update Roster di KV (Kuota tetap sama / gratis)
  const currentQuota = Number(teamData.transferQuotaUsed || 0);
  const nowIso = new Date().toISOString();
  await kv.hset(`teams:${teamSlug}`, {
    players: JSON.stringify(players),
    updatedAt: nowIso,
  });
  teamData.players = players;
  teamData.updatedAt = nowIso;

  // Eksekusi Cabut Role & Reset Nickname di Discord API
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const rolesRemoved: string[] = [];

  if (guildId && targetDiscordId && isValidSnowflake(targetDiscordId)) {
    if (teamData.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'DELETE').catch((err) =>
        console.error('[REMOVE TEAM ROLE ERROR]:', err)
      );
      rolesRemoved.push(`Role Tim Dicabut: <@&${teamData.discordRoleId}>`);
    }
    await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: null }).catch((err) =>
      console.error('[RESET NICKNAME ERROR]:', err)
    );
    rolesRemoved.push('Reset Nickname Server ke Nama Asli');
  }

  // Refresh Embed & News Log
  refreshTeamEmbeds(teamSlug, teamData, players, currentQuota).catch(console.error);

  sendTransferNewsLog({
    teamName: teamData.namaTim,
    teamKode: teamData.kodeTim,
    teamEmojiId: teamData.emojiId,
    teamHex: teamData.warna,
    action: 'OUT',
    targetIgn: removed.ign,
    oldIdDl: removed.idDuelLinks,
  }).catch(console.error);

  const userMention = targetDiscordId ? `<@${targetDiscordId}>` : `@${removed.discord || removed.ign}`;
  const details = `**Akun:** ${userMention}\n**IGN:** ${removed.ign}\n**ID Duel Links:** ${removed.idDuelLinks}\n**Status:** Dipindahkan ke Free Agent Pool (Gratis Kuota)`;

  await sendAdminAuditLog({
    actorId,
    actorRoleText,
    teamSlug,
    teamName,
    subcommand: 'OUT',
    targetUserId: targetDiscordId || rawUser,
    targetIgn: removed.ign,
    targetDl: removed.idDuelLinks,
    roleChanges: { removed: rolesRemoved },
    quotaUsed: currentQuota,
    status: 'SUCCESS',
  });

  return createCampSuccessEmbed(actorId, actorRoleText, 'OUT (Keluarkan Pemain)', details, currentQuota);
}
