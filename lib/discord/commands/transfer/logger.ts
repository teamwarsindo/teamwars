import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal, getFooterText, isValidSnowflake } from '@/lib/discord/utils';
import { PlayerItem, TeamKVData, getWibTimestamp } from './types';

function getRoleIcon(role?: string): string {
  if (!role) return '';
  const r = role.toLowerCase();
  if (r.includes('ketua') && !r.includes('wakil')) return ' 👑';
  if (r.includes('wakil')) return ' 🎖️';
  return '';
}

// ── 1. SINKRONISASI LIVE EMBED ROSTER & TRACKER CAMP ───────────────
export async function refreshTeamEmbeds(
  teamSlug: string,
  teamData: TeamKVData,
  players: PlayerItem[],
  quotaUsedOverride?: number
) {
  const createdAt = teamData.createdAt || new Date().toISOString();
  const updatedAt = teamData.updatedAt || new Date().toISOString();
  const ketua = players.find((p) => p.role === 'Ketua') || { ign: '-' };
  const wakil = players.find((p) => p.role === 'Wakil Ketua') || { ign: '-' };

  // Update Embed Channel Roster Utama Admin
  if (teamData.adminMsgId && DISCORD_CONFIG.CH_ROSTER) {
    const playerListString = players.map((p) => `${p.ign} (${p.idDuelLinks})`).join('\n');
    const rosterPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          color: hexToDecimal(teamData.warna || '#3498db'),
          thumbnail: teamData.logoTim ? { url: teamData.logoTim } : undefined,
          fields: [
            { name: 'Ketua', value: ketua.ign, inline: true },
            { name: 'Wakil', value: wakil.ign, inline: true },
            { name: 'Players', value: playerListString, inline: false },
          ],
          footer: { text: getFooterText(createdAt, updatedAt) },
        },
      ],
    };
    await discordAPI(
      `/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${teamData.adminMsgId}`,
      'PATCH',
      rosterPayload
    ).catch((err) => console.error('[ROSTER EMBED PATCH ERROR]:', err));
  }

  // Update Embed Tracker di Channel Camp Tim
  if (teamData.trackerMsgId && teamData.discordChannelId) {
    const verifiedHash = (await kv.hgetall<Record<string, string>>('global:verified_users')) || {};
    const verifiedUsernames = new Set(Object.keys(verifiedHash).map((k) => k.toLowerCase()));
    const verifiedIds = new Set(Object.values(verifiedHash));

    let verifiedCount = 0;
    let rosterText = '';

    players.forEach((p) => {
      const rawIgn = (p.ign || '').trim();
      const discordUser = (p.discord || '').trim().replace(/^@/, '');
      const pDiscordClean = discordUser.toLowerCase();

      const isVerified =
        (pDiscordClean && verifiedUsernames.has(pDiscordClean)) ||
        (p.discordId && verifiedIds.has(p.discordId));

      if (isVerified) verifiedCount++;

      const checkIcon = isVerified ? '✅' : '❌';
      const roleIconSuffix = getRoleIcon(p.role);

      rosterText += `${checkIcon} **${rawIgn || '-'}** (@${discordUser || '-'})${roleIconSuffix}\n`;
    });

    const maxTransferQuota = 2;
    const currentQuotaUsed =
      quotaUsedOverride !== undefined ? quotaUsedOverride : (teamData.transferQuotaUsed || 0);
    const remainingQuota = Math.max(0, maxTransferQuota - currentQuotaUsed);

    const trackerPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          description: `**DAFTAR ROSTER:**\n${rosterText}\n*Keterangan: 👑 Ketua | 🎖️ Wakil*`,
          color: hexToDecimal(teamData.warna || '#3498db'),
          fields: [
            {
              name: '📌 Role Tim',
              value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : '*(Belum Ada)*',
              inline: true,
            },
            {
              name: '📊 Status Verifikasi',
              value: `**${verifiedCount} / ${players.length}** Terverifikasi`,
              inline: true,
            },
            {
              name: '🔄 Kuota Transfer',
              value: `**${currentQuotaUsed} / ${maxTransferQuota}** Terpakai *(Sisa: ${remainingQuota})*`,
              inline: false,
            },
          ],
          footer: { text: getFooterText(createdAt, updatedAt) },
        },
      ],
    };

    await discordAPI(
      `/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`,
      'PATCH',
      trackerPayload
    ).catch((err) => console.error('[TRACKER EMBED PATCH ERROR]:', err));
  }
}

// ── 2. PENGUMUMAN BURSA TRANSFER PUBLIK ────────────────────────────
export async function sendTransferNewsLog(params: {
  teamName: string;
  teamKode?: string;
  teamEmojiId?: string;
  teamHex?: string;
  action: 'ADD' | 'OUT' | 'EDIT_DL' | 'SET_LEADER' | 'SET_WAKIL';
  targetIgn: string;
  oldIdDl?: string;
  newIdDl?: string;
}) {
  const { teamName, teamKode, teamEmojiId, teamHex, action, targetIgn, oldIdDl, newIdDl } = params;
  
  // Arahkan log publik ke channel #transfer-news
  const targetChannelId = DISCORD_CONFIG.CH_LOG_TRANSFER;
  if (!targetChannelId) return;

  const emojiPrefix = teamEmojiId ? `<:${teamKode || 'team'}:${teamEmojiId}> ` : '';
  let textContent = '';

  if (action === 'ADD') {
    textContent = `**${targetIgn}** (${newIdDl}) telah ditambahkan ke roster tim ${emojiPrefix}**${teamName}**`;
  } else if (action === 'OUT') {
    textContent = `**${targetIgn}** (${oldIdDl}) telah dikeluarkan dari roster tim ${emojiPrefix}**${teamName}**`;
  } else if (action === 'EDIT_DL') {
    textContent = `ID Duel Links **${targetIgn}** dari tim ${emojiPrefix}**${teamName}** diubah menjadi \`${newIdDl}\``;
  } else if (action === 'SET_LEADER') {
    textContent = `**${targetIgn}** telah diangkat menjadi **Ketua** ${emojiPrefix}**${teamName}**`;
  } else if (action === 'SET_WAKIL') {
    textContent = `**${targetIgn}** telah diangkat menjadi **Wakil Ketua** ${emojiPrefix}**${teamName}**`;
  }

  // Tepi warna embed mengikuti warna tim masing-masing
  const payload = {
    embeds: [
      {
        description: textContent,
        color: hexToDecimal(teamHex || '#3498db'),
      },
    ],
  };

  await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', payload).catch((err) =>
    console.error('[TRANSFER NEWS LOG ERROR]:', err)
  );
}

// ── 3. AUDIT LOG KHUSUS ADMIN ──────────────────────────────────────
export async function sendAdminAuditLog(params: {
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
    const isSnowflake = isValidSnowflake(targetUserId);
    const userMention = isSnowflake ? `<@${targetUserId}>` : `@${targetUserId}`;
    const targetDetails = [
      `**Akun:** ${userMention} (\`${targetUserId}\`)`,
      targetIgn ? `**IGN:** \`${targetIgn}\`` : null,
      targetDl ? `**ID DL:** \`${targetDl}\`` : null,
    ]
      .filter(Boolean)
      .join('\n');

    fields.push({
      name: '🎯 Target Pemain',
      value: targetDetails,
      inline: false,
    });
  }

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
