import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal, getFooterText } from '../utils';
import { TeamKVData, PlayerItem } from './transfer-service';

function getRoleIcon(role?: string): string {
  if (!role) return '';
  const r = role.toLowerCase();
  if (r.includes('ketua') && !r.includes('wakil')) return ' 👑';
  if (r.includes('wakil')) return ' 🎖️';
  return '';
}

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

  // 1. UPDATE EMBED CH_ROSTER
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

  // 2. UPDATE EMBED TRACKER CAMP TIM
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
