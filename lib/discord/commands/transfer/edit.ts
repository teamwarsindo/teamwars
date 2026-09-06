import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { createCampSuccessEmbed } from '@/lib/discord/messages/transfer-log';
import {
  TransferContext,
  PlayerItem,
  formatDuelId,
  cleanDuelId,
  parsePlayers,
  findPlayerIndex,
  resolveDiscordId,
} from './types';
import { getConflictingPlayerDetails } from './validation';
import { refreshTeamEmbeds, sendTransferNewsLog, sendAdminAuditLog } from './logger';

export async function handleSubcommandEdit(ctx: TransferContext) {
  const { actorId, actorRoleText, teamSlug, teamName, teamData, opts, isAdmin, isKetua } = ctx;

  const rawUser = opts.find((o: any) => o.name === 'user')?.value;
  const newIdDl = opts.find((o: any) => o.name === 'new_id_dl')?.value;
  const position = opts.find((o: any) => o.name === 'position')?.value as 'Ketua' | 'Wakil Ketua' | undefined;

  if (!rawUser) throw new Error('Option `user` wajib diisi!');
  if (!newIdDl && !position) {
    throw new Error('Wajib mengisikan salah satu opsi: `new_id_dl` atau `position`!');
  }

  const players = parsePlayers(teamData.players);
  const targetIdx = findPlayerIndex(players, rawUser);
  if (targetIdx === -1) throw new Error('Pemain target tidak ditemukan di dalam roster tim Anda.');

  const targetPlayer = players[targetIdx];
  const targetDiscordId = await resolveDiscordId(targetPlayer.discord, targetPlayer.discordId);

  // -----------------------------------------------------------------
  // 1. EDIT ID DUEL LINKS (+1 Kuota Transfer)
  // -----------------------------------------------------------------
  if (newIdDl) {
    let currentQuota = Number(teamData.transferQuotaUsed || 0);
    if (currentQuota >= 2) throw new Error('Kuota transfer tim Anda sudah habis (Maksimal 2/2 Kuota Transfer).');

    const formattedDl = formatDuelId(newIdDl);
    const cleanDl = cleanDuelId(newIdDl);
    if (cleanDl.length !== 9) throw new Error('ID Duel Links baru harus 9 digit angka.');

    const oldDl = targetPlayer.idDuelLinks;
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

    targetPlayer.idDuelLinks = formattedDl;
    await kv.hset('global:duellinks', { [cleanDl]: teamSlug, [formattedDl]: teamSlug });

    currentQuota += 1;
    const nowIso = new Date().toISOString();
    await kv.hset(`teams:${teamSlug}`, {
      players: JSON.stringify(players),
      transferQuotaUsed: currentQuota,
      updatedAt: nowIso,
    });
    teamData.players = players;
    teamData.transferQuotaUsed = currentQuota;
    teamData.updatedAt = nowIso;

    refreshTeamEmbeds(teamSlug, teamData, players, currentQuota).catch(console.error);

    sendTransferNewsLog({
      teamName: teamData.namaTim,
      teamKode: teamData.kodeTim,
      teamEmojiId: teamData.emojiId,
      teamHex: teamData.warna,
      action: 'EDIT_DL',
      targetIgn: targetPlayer.ign,
      oldIdDl: oldDl,
      newIdDl: formattedDl,
    }).catch(console.error);

    const userMention = targetDiscordId ? `<@${targetDiscordId}>` : `@${targetPlayer.discord || targetPlayer.ign}`;
    const details = `**Akun:** ${userMention}\n**IGN:** ${targetPlayer.ign}\n**ID Lama:** ${oldDl}\n**ID Baru:** ${formattedDl}\n**Status:** Potong 1 Kuota`;

    await sendAdminAuditLog({
      actorId,
      actorRoleText,
      teamSlug,
      teamName,
      subcommand: 'EDIT_DL',
      targetUserId: targetDiscordId || rawUser,
      targetIgn: targetPlayer.ign,
      targetDl: `Ganti ID: ${oldDl} ➔ ${formattedDl}`,
      quotaUsed: currentQuota,
      status: 'SUCCESS',
    });

    return createCampSuccessEmbed(actorId, actorRoleText, 'EDIT (Ganti ID Duel Links)', details, currentQuota);
  }

  // -----------------------------------------------------------------
  // 2. EDIT POSITION / JABATAN (Gratis Kuota + Mutasi Role Discord)
  // -----------------------------------------------------------------
  if (position) {
    if (targetDiscordId === actorId || targetPlayer.discord?.toLowerCase() === actorId.toLowerCase()) {
      throw new Error('Anda tidak diperbolehkan mengubah atau memindahkan jabatan Anda sendiri.');
    }

    if (position === 'Ketua' && !isAdmin) {
      throw new Error('Hanya Admin Panitia yang memiliki izin untuk mengangkat Ketua Tim baru.');
    }
    if (position === 'Wakil Ketua' && !isAdmin && !isKetua) {
      throw new Error('Hanya Ketua Tim atau Admin yang memiliki izin untuk mengangkat Wakil Ketua Tim.');
    }

    // Cari pejabat lama sebelum diubah
    const oldLeader = players.find((p) => p.role === position);
    const oldLeaderDiscordId = oldLeader
      ? await resolveDiscordId(oldLeader.discord, oldLeader.discordId)
      : null;

    // Mutasi di data array
    players.forEach((p) => {
      if (p.role === position) p.role = 'Anggota';
    });
    targetPlayer.role = position;

    const ketua = players.find((p) => p.role === 'Ketua');
    const wakil = players.find((p) => p.role === 'Wakil Ketua');
    const anggota = players.filter((p) => p.role === 'Anggota');
    const orderedPlayers = [...(ketua ? [ketua] : []), ...(wakil ? [wakil] : []), ...anggota];

    const currentQuota = Number(teamData.transferQuotaUsed || 0);
    const nowIso = new Date().toISOString();
    await kv.hset(`teams:${teamSlug}`, {
      players: JSON.stringify(orderedPlayers),
      updatedAt: nowIso,
    });
    teamData.players = orderedPlayers;
    teamData.updatedAt = nowIso;

    // Mutasi Role Discord REST API
    const guildId = DISCORD_CONFIG.GUILD_ID;
    const targetRoleId = position === 'Ketua' ? DISCORD_CONFIG.ROLE_KETUA : DISCORD_CONFIG.ROLE_WAKIL;
    const roleChanges: { added: string[]; removed: string[] } = { added: [], removed: [] };

    if (guildId && targetRoleId) {
      // Cabut role dari pejabat lama
      if (oldLeaderDiscordId && oldLeaderDiscordId !== targetDiscordId && isValidSnowflake(oldLeaderDiscordId)) {
        await discordAPI(`/guilds/${guildId}/members/${oldLeaderDiscordId}/roles/${targetRoleId}`, 'DELETE').catch((err) =>
          console.error(`[REMOVE OLD ${position} ROLE ERROR]:`, err)
        );
        roleChanges.removed.push(`Role ${position} dicabut dari <@${oldLeaderDiscordId}>`);
      }

      // Pasang role ke pejabat baru
      if (targetDiscordId && isValidSnowflake(targetDiscordId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${targetRoleId}`, 'PUT').catch((err) =>
          console.error(`[ADD NEW ${position} ROLE ERROR]:`, err)
        );
        roleChanges.added.push(`Role ${position} diberikan ke <@${targetDiscordId}>`);
      }
    }

    refreshTeamEmbeds(teamSlug, teamData, orderedPlayers, currentQuota).catch(console.error);

    sendTransferNewsLog({
      teamName: teamData.namaTim,
      teamKode: teamData.kodeTim,
      teamEmojiId: teamData.emojiId,
      teamHex: teamData.warna,
      action: position === 'Ketua' ? 'SET_LEADER' : 'SET_WAKIL',
      targetIgn: targetPlayer.ign,
    }).catch(console.error);

    const userMention = targetDiscordId ? `<@${targetDiscordId}>` : `@${targetPlayer.discord || targetPlayer.ign}`;
    const details = `**Akun:** ${userMention}\n**IGN:** ${targetPlayer.ign}\n**Jabatan Baru:** \`${position}\`\n**Status:** Gratis Kuota`;

    await sendAdminAuditLog({
      actorId,
      actorRoleText,
      teamSlug,
      teamName,
      subcommand: `SET_${position === 'Ketua' ? 'LEADER' : 'WAKIL'}`,
      targetUserId: targetDiscordId || rawUser,
      targetIgn: targetPlayer.ign,
      roleChanges,
      quotaUsed: currentQuota,
      status: 'SUCCESS',
    });

    return createCampSuccessEmbed(actorId, actorRoleText, `EDIT (Angkat ${position})`, details, currentQuota);
  }
}
