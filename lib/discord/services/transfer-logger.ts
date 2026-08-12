import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { TeamKVData, PlayerItem } from './transfer-service';

export async function sendTransferNewsLog(teamHex: string, messageText: string) {
  if (!DISCORD_CONFIG.CH_LOG_TRANSFER) return;
  const payload = {
    embeds: [{ description: messageText, color: hexToDecimal(teamHex || '#3498db') }],
  };
  await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG_TRANSFER}/messages`, 'POST', payload).catch(() => null);
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

  const getFooterString = () =>
    `Registered: ${new Date(createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date(createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\nLast Updated: ${new Date(updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date(updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  // 1. CH_ROSTER
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
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${teamData.adminMsgId}`, 'PATCH', rosterPayload).catch(() => null);
  }

  // 2. Match Camp Tracker
  if (teamData.trackerMsgId && teamData.discordChannelId) {
    const verifiedHash = (await kv.hgetall<Record<string, string>>('global:verified_users')) || {};
    const verifiedUsernames = new Set(Object.keys(verifiedHash).map((k) => k.toLowerCase()));
    const verifiedIds = new Set(Object.values(verifiedHash));

    let verifiedCount = 0;
    let rosterText = '';

    players.forEach((p) => {
      const pDiscordClean = p.discord ? p.discord.toLowerCase() : '';
      const isVerified = (pDiscordClean && verifiedUsernames.has(pDiscordClean)) || (p.discordId && verifiedIds.has(p.discordId));

      if (isVerified) {
        verifiedCount++;
        rosterText += `✅ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      } else {
        rosterText += `❌ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      }
    });

    const currentQuotaUsed = quotaUsedOverride !== undefined ? quotaUsedOverride : (teamData.transferQuotaUsed || 0);

    const trackerPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          description: `**DAFTAR ROSTER:**\n${rosterText}`,
          color: hexToDecimal(teamData.warna || '#3498db'),
          fields: [
            { name: '📌 Role Tim', value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: '📊 Status', value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true },
            { name: '🔄 Kuota Transfer', value: `**${currentQuotaUsed} / 2** Terpakai`, inline: false },
          ],
          footer: { text: getFooterString() },
        },
      ],
    };
    await discordAPI(`/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, 'PATCH', trackerPayload).catch(() => null);
  }
  }
    
