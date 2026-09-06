import { executeTransferOut } from '@/lib/discord/services/transfer-service';
import { createCampSuccessEmbed } from '@/lib/discord/messages/transfer-log';
import { TransferContext, resolveTargetDiscordId, sendAdminAuditLog } from './types';

export async function handleSubcommandOut(ctx: TransferContext) {
  const { actorId, actorRoleText, teamSlug, teamName, teamData, opts } = ctx;

  const rawUser = opts.find((o: any) => o.name === 'user')?.value;
  if (!rawUser) throw new Error('Option `user` wajib diisi!');

  const resolvedDiscordId = (await resolveTargetDiscordId(rawUser)) || rawUser;
  const result = await executeTransferOut(teamSlug, resolvedDiscordId);

  const rolesRemoved: string[] = [];
  if (teamData.discordRoleId) rolesRemoved.push(`Role Tim Dicabut: <@&${teamData.discordRoleId}>`);
  rolesRemoved.push('Reset Nickname Server ke Nama Asli');

  const finalUserId = result.removedPlayer.discordId || resolvedDiscordId;
  const userMention = finalUserId ? `<@${finalUserId}>` : `\`${rawUser}\``;

  const details = `**Akun:** ${userMention}\n**IGN:** ${result.removedPlayer.ign}\n**ID Duel Links:** ${result.removedPlayer.idDuelLinks}\n**Status:** Dipindahkan ke Free Agent Pool (Gratis Kuota)`;

  const responsePayload = createCampSuccessEmbed(
    actorId,
    actorRoleText,
    'OUT (Keluarkan Pemain)',
    details,
    result.currentQuota
  );

  await sendAdminAuditLog({
    actorId,
    actorRoleText,
    teamSlug,
    teamName,
    subcommand: 'OUT',
    targetUserId: finalUserId,
    targetIgn: result.removedPlayer.ign,
    targetDl: result.removedPlayer.idDuelLinks,
    roleChanges: { removed: rolesRemoved },
    quotaUsed: result.currentQuota,
    status: 'SUCCESS',
  });

  return responsePayload;
}
