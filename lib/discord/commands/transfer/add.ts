import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { executeTransferAdd } from '@/lib/discord/services/transfer-service';
import { createCampSuccessEmbed } from '@/lib/discord/messages/transfer-log';
import { TransferContext, resolveTargetDiscordId, sendAdminAuditLog } from './types';

export async function handleSubcommandAdd(ctx: TransferContext) {
  const { actorId, actorRoleText, teamSlug, teamName, teamData, opts, interaction } = ctx;

  const rawUser = opts.find((o: any) => o.name === 'user')?.value;
  const ign = opts.find((o: any) => o.name === 'ign')?.value;
  const rawIdDl = opts.find((o: any) => o.name === 'id_dl')?.value;

  if (!rawUser || !ign || !rawIdDl) {
    throw new Error('Option `user`, `ign`, dan `id_dl` wajib diisi!');
  }

  const resolvedDiscordId = await resolveTargetDiscordId(rawUser);
  if (!resolvedDiscordId) {
    throw new Error(`Akun Discord \`${rawUser}\` belum terverifikasi di sistem TWI. Harap verifikasi terlebih dahulu.`);
  }

  const resolvedUsers = interaction.data?.resolved?.users || {};
  const targetUserData = resolvedUsers[rawUser] || resolvedUsers[resolvedDiscordId] || {};
  const targetUsername = targetUserData.username || rawUser;

  const guildMemberRes = await discordAPI(
    `/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${resolvedDiscordId}`,
    'GET'
  ).catch(() => null);
  const targetRoles: string[] = guildMemberRes?.roles || [];

  const result = await executeTransferAdd({
    teamSlug,
    targetDiscordId: resolvedDiscordId,
    targetUsername,
    ign,
    rawIdDl,
    targetRoles,
  });

  const rolesAdded: string[] = [];
  if (teamData.discordRoleId) rolesAdded.push(`Role Tim: <@&${teamData.discordRoleId}>`);
  if (DISCORD_CONFIG.ROLE_DUELIST) rolesAdded.push(`Role Duelist: <@&${DISCORD_CONFIG.ROLE_DUELIST}>`);
  if (DISCORD_CONFIG.ROLE_VERIFIED) rolesAdded.push(`Role Verified: <@&${DISCORD_CONFIG.ROLE_VERIFIED}>`);
  rolesAdded.push(`Nickname Server: \`${result.addedPlayer.ign}\``);

  const statusNote = result.isOldPlayer
    ? 'Transfer Pemain Lama (Potong Kuota)'
    : 'Free Agent Murni (Gratis Kuota)';
  const details = `**Akun:** <@${resolvedDiscordId}>\n**IGN:** ${result.addedPlayer.ign}\n**ID Duel Links:** ${result.addedPlayer.idDuelLinks}\n**Status:** ${statusNote}`;

  const responsePayload = createCampSuccessEmbed(
    actorId,
    actorRoleText,
    'ADD (Tambah Pemain)',
    details,
    result.currentQuota
  );

  await sendAdminAuditLog({
    actorId,
    actorRoleText,
    teamSlug,
    teamName,
    subcommand: 'ADD',
    targetUserId: resolvedDiscordId,
    targetIgn: result.addedPlayer.ign,
    targetDl: result.addedPlayer.idDuelLinks,
    roleChanges: { added: rolesAdded },
    quotaUsed: result.currentQuota,
    status: 'SUCCESS',
  });

  return responsePayload;
    }
