import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import {
  executeTransferOut,
  executeTransferAdd,
  executeTransferEditDl,
  executeTransferSetLeader,
  PlayerItem,
  getTeamBySlug,
  parsePlayers,
} from '@/lib/discord/services/transfer-service';
import { createCampSuccessEmbed, createCampFailureEmbed } from '@/lib/discord/messages/transfer-log';

function getSubcommandData(interaction: any) {
  const options = interaction.data?.options || [];
  const subcommandObj = options.find((o: any) => o.type === 1);
  if (!subcommandObj) return { subcommand: null, opts: [] };
  return {
    subcommand: subcommandObj.name,
    opts: subcommandObj.options || [],
  };
}

// 🟢 Helper format waktu WIB untuk Audit Log
function getWibTimestamp(): string {
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date()) + ' WIB'
  );
}

// 🟢 Fungsi Pengiriman Audit Log ke CH_LOG
async function sendAdminAuditLog(params: {
  actorId: string;
  actorRoleText: string;
  teamSlug: string;
  teamName: string;
  subcommand: string;
  targetUserId?: string;
  targetIgn?: string;
  targetDl?: string;
  roleChanges?: { added?: string[]; removed?: string[] };
  quotaUsed?: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}) {
  const {
    actorId,
    actorRoleText,
    teamSlug,
    teamName,
    subcommand,
    targetUserId,
    targetIgn,
    targetDl,
    roleChanges,
    quotaUsed,
    status,
    errorMessage,
  } = params;

  if (!DISCORD_CONFIG.CH_LOG) return;

  const isSuccess = status === 'SUCCESS';
  const color = isSuccess ? 0x2ecc71 : 0xe74c3c;
  const title = isSuccess
    ? `📋 [TRANSFER LOG] /transfer ${subcommand.toUpperCase()} - Berhasil`
    : `⚠️ [TRANSFER FAILED] /transfer ${subcommand.toUpperCase()} - Gagal`;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: '👤 Eksekutor / Aktor',
      value: `<@${actorId}> (\`${actorId}\`)\n**Jabatan:** ${actorRoleText}`,
      inline: true,
    },
    {
      name: '🛡️ Tim Terkait',
      value: `**${teamName || teamSlug}** (\`${teamSlug}\`)`,
      inline: true,
    },
  ];

  if (targetUserId) {
    const targetDetails = [
      `**Akun:** <@${targetUserId}> (\`${targetUserId}\`)`,
      targetIgn ? `**IGN:** \`${targetIgn}\`` : null,
      targetDl ? `**ID DL:** \`${targetDl}\`` : null,
    ]
      .filter(Boolean)
      .join('\n');

    fields.push({
      name: '🎯 Target Pemain',
      value: targetDetails || `<@${targetUserId}>`,
      inline: false,
    });
  }

  // Log Mutasi Role Discord
  if (roleChanges) {
    if (roleChanges.added && roleChanges.added.length > 0) {
      fields.push({
        name: '🟢 Role Discord Ditambahkan',
        value: roleChanges.added.map((r) => `• ${r}`).join('\n'),
        inline: false,
      });
    }
    if (roleChanges.removed && roleChanges.removed.length > 0) {
      fields.push({
        name: '🔴 Role Discord Dicabut / Direset',
        value: roleChanges.removed.map((r) => `• ${r}`).join('\n'),
        inline: false,
      });
    }
  }

  if (quotaUsed !== undefined) {
    fields.push({
      name: '📊 Sisa Kuota Tim',
      value: `Terpakai: **${quotaUsed}/2**`,
      inline: true,
    });
  }

  if (!isSuccess && errorMessage) {
    fields.push({
      name: '❌ Alasan Error / Kegagalan',
      value: `\`\`\`${errorMessage}\`\`\``,
      inline: false,
    });
  }

  const payload = {
    embeds: [
      {
        title,
        color,
        fields,
        footer: { text: `Eksekusi: ${getWibTimestamp()} • Team Wars Indonesia` },
      },
    ],
  };

  await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', payload).catch((err) =>
    console.error('[ADMIN AUDIT LOG ERROR]:', err)
  );
}

// ============================================================================
// AUTOCOMPLETE HANDLER
// ============================================================================
export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
    if (!teamSlug) return { type: 8, data: { choices: [] } };

    const { opts } = getSubcommandData(interaction);
    const focusedOption = opts.find((o: any) => o.focused);
    if (!focusedOption || focusedOption.name !== 'user') return { type: 8, data: { choices: [] } };

    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

    const players: PlayerItem[] = parsePlayers(teamData.players);
    const searchValue = (focusedOption.value || '').toLowerCase();

    const choices = players
      .filter((p) => (p.ign || '').toLowerCase().includes(searchValue) || (p.discord || '').toLowerCase().includes(searchValue))
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ign} (@${p.discord || p.discordId}) - ${p.role}`,
        value: p.discordId || p.discord || p.ign,
      }));

    return { type: 8, data: { choices } };
  } catch {
    return { type: 8, data: { choices: [] } };
  }
}

// ============================================================================
// SLASH COMMAND HANDLER (Type 5 + waitUntil)
// ============================================================================
export async function handleTransferCommand(interaction: any) {
  const actorId = interaction.member?.user?.id;
  const actorRoles: string[] = interaction.member?.roles || [];
  const channelId = interaction.channel_id;
  const token = interaction.token;
  const appId = interaction.application_id || process.env.DISCORD_CLIENT_ID;

  // 🔒 1. Validasi Hak Akses Murni Berdasarkan Role Discord Server
  const isAdmin = !!DISCORD_CONFIG.ROLE_ADMIN && actorRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
  const isKetua = !!DISCORD_CONFIG.ROLE_KETUA && actorRoles.includes(DISCORD_CONFIG.ROLE_KETUA);
  const isWakil = !!DISCORD_CONFIG.ROLE_WAKIL && actorRoles.includes(DISCORD_CONFIG.ROLE_WAKIL);

  if (!isAdmin && !isKetua && !isWakil) {
    // Catat log percobaan akses ilegal ke CH_LOG
    sendAdminAuditLog({
      actorId,
      actorRoleText: 'User Biasa (Tanpa Role)',
      teamSlug: 'UNKNOWN',
      teamName: 'Unknown Camp',
      subcommand: 'UNAUTHORIZED_ATTEMPT',
      status: 'FAILED',
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

  // ⚡ 2. Eksekusi Background Worker dengan waitUntil
  waitUntil(
    (async () => {
      const targetUserId = opts.find((o: any) => o.name === 'user')?.value;
      let detectedTeamSlug = '';
      let detectedTeamName = '';

      try {
        // 1. Deteksi Tim dari Channel Camp
        const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
        if (!teamSlug) {
          throw new Error('Slash command `/transfer` hanya dapat digunakan di dalam Channel Camp Tim resmi.');
        }
        detectedTeamSlug = teamSlug;

        // 2. Ambil Data Tim
        const teamRes = await getTeamBySlug(teamSlug);
        if (!teamRes) {
          throw new Error(`Data tim dengan slug \`${teamSlug}\` tidak ditemukan di database.`);
        }
        detectedTeamName = teamRes.data.namaTim;

        let responsePayload: any = null;
        const roleChanges: { added?: string[]; removed?: string[] } = {};

        // -----------------------------------------------------------
        // SUBCOMMAND: ADD
        // -----------------------------------------------------------
        if (subcommand === 'add') {
          const ign = opts.find((o: any) => o.name === 'ign')?.value;
          const rawIdDl = opts.find((o: any) => o.name === 'id_dl')?.value;

          if (!targetUserId || !ign || !rawIdDl) {
            throw new Error('Option `user`, `ign`, dan `id_dl` wajib diisi!');
          }

          const resolvedUsers = interaction.data?.resolved?.users || {};
          const targetUserData = resolvedUsers[targetUserId] || {};
          const targetUsername = targetUserData.username || targetUserId;

          // Request GET Guild Member untuk periksa role target
          const guildMemberRes = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}`, 'GET');
          const targetRoles: string[] = guildMemberRes?.roles || [];

          const result = await executeTransferAdd({
            teamSlug,
            targetDiscordId: targetUserId,
            targetUsername,
            ign,
            rawIdDl,
            targetRoles,
          });

          // Catat role yang diberikan ke target
          const rolesAdded: string[] = [];
          if (teamRes.data.discordRoleId) rolesAdded.push(`Role Tim: <@&${teamRes.data.discordRoleId}>`);
          if (DISCORD_CONFIG.ROLE_DUELIST) rolesAdded.push(`Role Duelist: <@&${DISCORD_CONFIG.ROLE_DUELIST}>`);
          if (DISCORD_CONFIG.ROLE_VERIFIED) rolesAdded.push(`Role Verified: <@&${DISCORD_CONFIG.ROLE_VERIFIED}>`);
          rolesAdded.push(`Nickname Server: \`[${teamRes.data.kodeTim || 'TIM'}] ${result.addedPlayer.ign}\``);
          roleChanges.added = rolesAdded;

          const statusNote = result.isOldPlayer ? 'Transfer Pemain Lama (Potong Kuota)' : 'Free Agent Murni (Gratis Kuota)';
          const details = `**Akun:** <@${targetUserId}>\n**IGN:** ${result.addedPlayer.ign}\n**ID Duel Links:** ${result.addedPlayer.idDuelLinks}\n**Status:** ${statusNote}`;
          responsePayload = createCampSuccessEmbed(actorId, actorRoleText, 'ADD (Tambah Pemain)', details, result.currentQuota);

          // Kirim Admin Audit Log
          await sendAdminAuditLog({
            actorId,
            actorRoleText,
            teamSlug,
            teamName: detectedTeamName,
            subcommand: 'ADD',
            targetUserId,
            targetIgn: result.addedPlayer.ign,
            targetDl: result.addedPlayer.idDuelLinks,
            roleChanges,
            quotaUsed: result.currentQuota,
            status: 'SUCCESS',
          });
        }

        // -----------------------------------------------------------
        // SUBCOMMAND: OUT
        // -----------------------------------------------------------
        else if (subcommand === 'out') {
          if (!targetUserId) throw new Error('Option `user` wajib diisi!');

          const result = await executeTransferOut(teamSlug, targetUserId);

          const rolesRemoved: string[] = [];
          if (teamRes.data.discordRoleId) rolesRemoved.push(`Role Tim Dicabut: <@&${teamRes.data.discordRoleId}>`);
          rolesRemoved.push('Nickname Server Direset ke Default (null)');
          roleChanges.removed = rolesRemoved;

          const details = `**Akun:** <@${result.removedPlayer.discordId}>\n**IGN:** ${result.removedPlayer.ign}\n**ID Duel Links:** ${result.removedPlayer.idDuelLinks}\n**Status:** Dipindahkan ke Free Agent Pool`;
          responsePayload = createCampSuccessEmbed(actorId, actorRoleText, 'OUT (Keluarkan Pemain)', details, result.currentQuota);

          // Kirim Admin Audit Log
          await sendAdminAuditLog({
            actorId,
            actorRoleText,
            teamSlug,
            teamName: detectedTeamName,
            subcommand: 'OUT',
            targetUserId: result.removedPlayer.discordId,
            targetIgn: result.removedPlayer.ign,
            targetDl: result.removedPlayer.idDuelLinks,
            roleChanges,
            quotaUsed: result.currentQuota,
            status: 'SUCCESS',
          });
        }

        // -----------------------------------------------------------
        // SUBCOMMAND: EDIT
        // -----------------------------------------------------------
        else if (subcommand === 'edit') {
          const newIdDl = opts.find((o: any) => o.name === 'new_id_dl')?.value;
          const position = opts.find((o: any) => o.name === 'position')?.value as 'Ketua' | 'Wakil Ketua' | undefined;

          if (!targetUserId) throw new Error('Option `user` wajib diisi!');
          if (!newIdDl && !position) {
            throw new Error('Wajib mengisikan salah satu opsi: `new_id_dl` atau `position`!');
          }

          if (newIdDl) {
            const resultDl = await executeTransferEditDl(teamSlug, targetUserId, newIdDl);
            const details = `**Akun:** <@${targetUserId}>\n**IGN:** ${resultDl.player.ign}\n**ID Lama:** ${resultDl.oldDl}\n**ID Baru:** ${resultDl.newDl}`;
            responsePayload = createCampSuccessEmbed(actorId, actorRoleText, 'EDIT (Ganti ID Duel Links)', details, resultDl.currentQuota);

            await sendAdminAuditLog({
              actorId,
              actorRoleText,
              teamSlug,
              teamName: detectedTeamName,
              subcommand: 'EDIT_DL',
              targetUserId,
              targetIgn: resultDl.player.ign,
              targetDl: `Ganti ID: ${resultDl.oldDl} ➔ ${resultDl.newDl}`,
              quotaUsed: resultDl.currentQuota,
              status: 'SUCCESS',
            });
          } else if (position) {
            const resultLeader = await executeTransferSetLeader(teamSlug, targetUserId, position, actorId, isAdmin, isKetua);
            const details = `**Akun:** <@${targetUserId}>\n**IGN:** ${resultLeader.player.ign}\n**Jabatan Baru:** \`${resultLeader.newRole}\``;
            responsePayload = createCampSuccessEmbed(actorId, actorRoleText, `EDIT (Angkat ${resultLeader.newRole})`, details, resultLeader.currentQuota);

            await sendAdminAuditLog({
              actorId,
              actorRoleText,
              teamSlug,
              teamName: detectedTeamName,
              subcommand: `SET_${position === 'Ketua' ? 'LEADER' : 'WAKIL'}`,
              targetUserId,
              targetIgn: resultLeader.player.ign,
              quotaUsed: resultLeader.currentQuota,
              status: 'SUCCESS',
            });
          }
        }

        // Update Thinking Message dengan Embed Hasil
        if (appId && token && responsePayload) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', responsePayload);
        }
      } catch (error: any) {
        console.error('[TRANSFER EXECUTION ERROR]:', error);

        // Kirim Audit Log Kegagalan ke CH_LOG
        await sendAdminAuditLog({
          actorId,
          actorRoleText,
          teamSlug: detectedTeamSlug || 'UNKNOWN',
          teamName: detectedTeamName || 'Unknown Camp',
          subcommand: subcommand || 'UNKNOWN',
          targetUserId,
          status: 'FAILED',
          errorMessage: error.message || 'Terjadi kesalahan sistem saat mengeksekusi transfer.',
        });

        // Update Thinking Message dengan Embed Failure
        if (appId && token) {
          const failEmbed = createCampFailureEmbed(
            actorId,
            (subcommand || 'TRANSFER').toUpperCase(),
            targetUserId || null,
            error.message || 'Terjadi kesalahan saat memproses transfer.'
          );
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', failEmbed);
        }
      }
    })()
  );

  // 🚀 3. Respon Instan Type 5 ke Discord (< 50ms)
  return {
    type: 5,
    data: { flags: 64 },
  };
}
  
