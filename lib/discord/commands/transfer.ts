import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { createCampFailureReply } from '@/lib/discord/messages/transfer-log';
import { sendAuditLog } from '@/lib/discord/messages/audit-log';
import { formatTransferAuditDetails } from '@/lib/discord/messages/log-templates';

import {
  TransferContext,
  getTeamBySlug,
  getSubcommandData,
  resolveDiscordId,
} from './transfer/types';
import { handleSubcommandAdd } from './transfer/add';
import { handleSubcommandOut } from './transfer/out';
import { handleSubcommandEdit } from './transfer/edit';

export async function handleTransferCommand(interaction: any) {
  const member = interaction.member;
  const user = member?.user;
  const actorId = user?.id;
  const actorRoles: string[] = member?.roles || [];
  const channelId = interaction.channel_id;
  const token = interaction.token;
  const appId = interaction.application_id || process.env.DISCORD_CLIENT_ID;

  const isAdmin = !!DISCORD_CONFIG.ROLE_ADMIN && actorRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
  const isKetua = !!DISCORD_CONFIG.ROLE_KETUA && actorRoles.includes(DISCORD_CONFIG.ROLE_KETUA);
  const isWakil = !!DISCORD_CONFIG.ROLE_WAKIL && actorRoles.includes(DISCORD_CONFIG.ROLE_WAKIL);

  const executor = {
    tag: actorId ? `<@${actorId}>` : '*(Unknown Tag)*',
    displayName: member?.nick || user?.global_name || user?.username || 'Unknown User',
    username: user?.username ? `@${user.username}` : '@unknown',
  };

  if (!isAdmin && !isKetua && !isWakil) {
    sendAuditLog({
      status: 'FAILED',
      executor,
      action: '/transfer (UNAUTHORIZED)',
      details: [
        '• **Konteks:** Percobaan eksekusi command tanpa otorisasi',
        `• **Channel ID:** \`${channelId}\``,
      ],
      errorMessage: 'Akses Ditolak: User tidak memiliki role Admin, Ketua, atau Wakil Ketua.',
    }).catch(() => null);

    return {
      type: 4,
      data: {
        content: '❌ **Akses Ditolak!** Hanya Ketua Tim, Wakil Ketua Tim, atau Admin yang dapat mengeksekusi transfer.',
        flags: 64,
      },
    };
  }

  const actorRoleText = isAdmin ? 'Admin' : isKetua ? 'Ketua Tim' : 'Wakil Ketua Tim';
  const { subcommand, opts } = getSubcommandData(interaction);

  if (!subcommand) {
    return { type: 4, data: { content: '❌ Subcommand tidak valid!', flags: 64 } };
  }

  waitUntil(
    (async () => {
      let detectedTeamSlug = '';
      let detectedTeamName = '';
      const rawUser = opts.find((o: any) => o.name === 'user')?.value;

      try {
        const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
        if (!teamSlug) {
          throw new Error('Slash command `/transfer` hanya dapat digunakan di dalam Channel Camp Tim resmi.');
        }
        detectedTeamSlug = teamSlug;

        const teamRes = await getTeamBySlug(teamSlug);
        if (!teamRes) {
          throw new Error(`Data tim dengan slug \`${teamSlug}\` tidak ditemukan di database.`);
        }
        detectedTeamName = teamRes.data.namaTim;

        const ctx: TransferContext = {
          interaction,
          actorId,
          actorRoleText,
          isAdmin,
          isKetua,
          isWakil,
          channelId,
          token,
          appId,
          teamSlug,
          teamName: detectedTeamName,
          teamData: teamRes.data,
          opts,
        };

        let responsePayload: any = null;

        if (subcommand === 'add') {
          responsePayload = await handleSubcommandAdd(ctx);
        } else if (subcommand === 'out') {
          responsePayload = await handleSubcommandOut(ctx);
        } else if (subcommand === 'edit') {
          responsePayload = await handleSubcommandEdit(ctx);
        }

        if (appId && token && responsePayload) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', responsePayload);
        }
      } catch (error: any) {
        console.error('[TRANSFER EXECUTION ERROR]:', error);

        const targetResolvedId = await resolveDiscordId(rawUser).catch(() => null);

        const auditDetails = formatTransferAuditDetails({
          teamName: detectedTeamName || 'Unknown Team',
          teamSlug: detectedTeamSlug || 'unknown',
          targetTag: targetResolvedId ? `<@${targetResolvedId}>` : rawUser ? `\`${rawUser}\`` : undefined,
          mutation: `Gagal menjalankan /transfer ${subcommand}`,
        });

        await sendAuditLog({
          status: 'FAILED',
          executor,
          action: `/transfer ${subcommand.toLowerCase()}`,
          details: auditDetails,
          errorMessage: error.message || 'Terjadi kesalahan sistem saat mengeksekusi transfer.',
        });

        if (appId && token) {
          const failEmbed = createCampFailureReply(
            error.message || 'Terjadi kesalahan saat memproses transfer.'
          );
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', failEmbed);
        }
      }
    })()
  );

  return {
    type: 5,
    data: { flags: 64 },
  };
}
