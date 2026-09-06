import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import {
  executeTransferEditDl,
  executeTransferSetLeader,
  parsePlayers,
} from '@/lib/discord/services/transfer-service';
import { createCampSuccessEmbed } from '@/lib/discord/messages/transfer-log';
import { TransferContext, resolveTargetDiscordId, sendAdminAuditLog } from './types';

export async function handleSubcommandEdit(ctx: TransferContext) {
  const { actorId, actorRoleText, teamSlug, teamName, teamData, opts, isAdmin, isKetua } = ctx;

  const rawUser = opts.find((o: any) => o.name === 'user')?.value;
  const newIdDl = opts.find((o: any) => o.name === 'new_id_dl')?.value;
  const position = opts.find((o: any) => o.name === 'position')?.value as 'Ketua' | 'Wakil Ketua' | undefined;

  if (!rawUser) throw new Error('Option `user` wajib diisi!');
  if (!newIdDl && !position) {
    throw new Error('Wajib mengisikan salah satu opsi: `new_id_dl` atau `position`!');
  }

  const resolvedDiscordId = (await resolveTargetDiscordId(rawUser)) || rawUser;

  // 1. Edit ID Duel Links (+1 Kuota)
  if (newIdDl) {
    const resultDl = await executeTransferEditDl(teamSlug, resolvedDiscordId, newIdDl);
    const details = `**Akun:** <@${resolvedDiscordId}>\n**IGN:** ${resultDl.player.ign}\n**ID Lama:** ${resultDl.oldDl}\n**ID Baru:** ${resultDl.newDl}\n**Status:** Potong 1 Kuota`;
    const responsePayload = createCampSuccessEmbed(
      actorId,
      actorRoleText,
      'EDIT (Ganti ID Duel Links)',
      details,
      resultDl.currentQuota
    );

    await sendAdminAuditLog({
      actorId,
      actorRoleText,
      teamSlug,
      teamName,
      subcommand: 'EDIT_DL',
      targetUserId: resolvedDiscordId,
      targetIgn: resultDl.player.ign,
      targetDl: `Ganti ID: ${resultDl.oldDl} ➔ ${resultDl.newDl}`,
      quotaUsed: resultDl.currentQuota,
      status: 'SUCCESS',
    });

    return responsePayload;
  }

  // 2. Ganti Posisi / Jabatan (Gratis Kuota + Mutasi Role Discord)
  if (position) {
    const players = parsePlayers(teamData.players);
    const oldLeader = players.find((p: any) => p.role === position);
    const oldLeaderDiscordId = oldLeader
      ? await resolveTargetDiscordId(oldLeader.discordId || oldLeader.discord)
      : null;

    const resultLeader = await executeTransferSetLeader(
      teamSlug,
      resolvedDiscordId,
      position,
      actorId,
      isAdmin,
      isKetua
    );

    const guildId = DISCORD_CONFIG.GUILD_ID;
    const targetRoleId = position === 'Ketua' ? DISCORD_CONFIG.ROLE_KETUA : DISCORD_CONFIG.ROLE_WAKIL;
    const roleChanges: { added: string[]; removed: string[] } = { added: [], removed: [] };

    if (guildId && targetRoleId) {
      if (oldLeaderDiscordId && oldLeaderDiscordId !== resolvedDiscordId && isValidSnowflake(oldLeaderDiscordId)) {
        await discordAPI(`/guilds/${guildId}/members/${oldLeaderDiscordId}/roles/${targetRoleId}`, 'DELETE').catch((err) =>
          console.error(`[REMOVE OLD ${position} ROLE ERROR]:`, err)
        );
        roleChanges.removed.push(`Role ${position} dicabut dari <@${oldLeaderDiscordId}>`);
      }

      if (resolvedDiscordId && isValidSnowflake(resolvedDiscordId)) {
        await discordAPI(`/guilds/${guildId}/members/${resolvedDiscordId}/roles/${targetRoleId}`, 'PUT').catch((err) =>
          console.error(`[ADD NEW ${position} ROLE ERROR]:`, err)
        );
        roleChanges.added.push(`Role ${position} diberikan ke <@${resolvedDiscordId}>`);
      }
    }

    const details = `**Akun:** <@${resolvedDiscordId}>\n**IGN:** ${resultLeader.player.ign}\n**Jabatan Baru:** \`${resultLeader.newRole}\`\n**Status:** Gratis Kuota`;
    const responsePayload = createCampSuccessEmbed(
      actorId,
      actorRoleText,
      `EDIT (Angkat ${resultLeader.newRole})`,
      details,
      resultLeader.currentQuota
    );

    await sendAdminAuditLog({
      actorId,
      actorRoleText,
      teamSlug,
      teamName,
      subcommand: `SET_${position === 'Ketua' ? 'LEADER' : 'WAKIL'}`,
      targetUserId: resolvedDiscordId,
      targetIgn: resultLeader.player.ign,
      roleChanges,
      quotaUsed: resultLeader.currentQuota,
      status: 'SUCCESS',
    });

    return responsePayload;
  }
}
