import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { TeamKVData, PlayerItem } from './transfer-service';

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

  const getFooterString = () => {
    const dateOpts: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    };
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    };

    const regDate = new Date(createdAt).toLocaleDateString('id-ID', dateOpts);
    const regTime = new Date(createdAt).toLocaleTimeString('id-ID', timeOpts);
    const upDate = new Date(updatedAt).toLocaleDateString('id-ID', dateOpts);
    const upTime = new Date(updatedAt).toLocaleTimeString('id-ID', timeOpts);

    return `Registered: ${regDate} at ${regTime} WIB\nLast Updated: ${upDate} at ${upTime} WIB`;
  };

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
          footer: { text: getFooterString() },
        },
      ],
    };
    await discordAPI(
      `/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${teamData.adminMsgId}`,
      'PATCH',
      rosterPayload
    ).catch(() => null);
  }

  // 2. UPDATE EMBED TRACKER CAMP TIM
  if (teamData.trackerMsgId && teamData.discordChannelId) {
    const verifiedHash = (await kv.hgetall<Record<string, string>>('global:verified_users')) || {};
    const verifiedUsernames = new Set(Object.keys(verifiedHash).map((k) => k.toLowerCase()));
    const verifiedIds = new Set(Object.values(verifiedHash));

    let verifiedCount = 0;
    let rosterText = '';

    players.forEach((p) => {
      const pDiscordClean = p.discord ? p.discord.trim().toLowerCase() : '';
      const isVerified =
        (pDiscordClean && verifiedUsernames.has(pDiscordClean)) ||
        (p.discordId && verifiedIds.has(p.discordId));

      const checkIcon = isVerified ? '✅' : '❌';
      if (isVerified) verifiedCount++;

      let roleBadge = '';
      if (p.role === 'Ketua') roleBadge = ' 👑';
      else if (p.role === 'Wakil Ketua') roleBadge = ' 🏅';

      rosterText += `${checkIcon} **${p.ign}** (\`@${p.discord}\`)${roleBadge}\n`;
    });

    const currentQuotaUsed =
      quotaUsedOverride !== undefined ? quotaUsedOverride : (teamData.transferQuotaUsed || 0);

    const trackerPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          description: `**DAFTAR ROSTER:**\n${rosterText}\n*Keterangan: 👑 Ketua | 🏅 Wakil*`,
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
              value: `**${currentQuotaUsed} / 2** Terpakai *(Sisa: ${2 - currentQuotaUsed})*`,
              inline: false,
            },
          ],
          footer: { text: getFooterString() },
        },
      ],
    };
    await discordAPI(
      `/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`,
      'PATCH',
      trackerPayload
    ).catch(() => null);
  }
              }
