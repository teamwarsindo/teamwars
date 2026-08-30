import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export interface TransferLogParams {
  teamName: string;
  teamKode?: string;
  teamEmojiId?: string;
  teamHex: string;
  action: 'OUT' | 'ADD' | 'EDIT_DL' | 'SET_LEADER' | 'SET_WAKIL';
  targetIgn: string;
  oldIdDl?: string;
  newIdDl?: string;
}

// 1. BROADCAST TRANSFER NEWS LOG (MENGGUNAKAN FORMAT <:kodeTim:emojiId>)
export async function sendTransferNewsLog(params: TransferLogParams): Promise<string | null> {
  const { teamName, teamKode, teamEmojiId, teamHex, action, targetIgn, oldIdDl, newIdDl } = params;
  const channelId = DISCORD_CONFIG.CH_LOG_TRANSFER;

  if (!channelId) return null;

  // Render emoji Discord sesuai format KV: <:kodeTim:emojiId>
  const teamEmoji = (teamKode && teamEmojiId)
    ? `<:${teamKode}:${teamEmojiId}> `
    : teamEmojiId
      ? `<:team:${teamEmojiId}> `
      : '';

  let description = '';

  switch (action) {
    case 'OUT':
      description = `**${targetIgn}** (${oldIdDl || '-'}) telah dikeluarkan dari roster tim ${teamEmoji}**${teamName}**`;
      break;
    case 'ADD':
      description = `**${targetIgn}** (${newIdDl || '-'}) telah ditambahkan ke roster tim ${teamEmoji}**${teamName}**`;
      break;
    case 'EDIT_DL':
      description = `**${targetIgn}** dari tim ${teamEmoji}**${teamName}** telah mengganti ID Game dari ${oldIdDl || '-'} menjadi **${newIdDl}**`;
      break;
    case 'SET_LEADER':
      description = `**${targetIgn}** telah diangkat menjadi **Ketua Tim** ${teamEmoji}**${teamName}**`;
      break;
    case 'SET_WAKIL':
      description = `**${targetIgn}** telah diangkat menjadi **Wakil Ketua** ${teamEmoji}**${teamName}**`;
      break;
  }

  const payload = {
    embeds: [
      {
        description,
        color: hexToDecimal(teamHex || '#00a8fc'),
      },
    ],
  };

  try {
    const res = await discordAPI(`/channels/${channelId}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error(`Gagal kirim Transfer News Log untuk ${teamName}:`, error);
    return null;
  }
}

// 2. EMBED BALASAN LOG SUKSES DI CAMP TIM
export function createCampSuccessEmbed(
  actorId: string,
  actorRoleText: string,
  actionText: string,
  details: string,
  currentQuota: number
) {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  return {
    embeds: [
      {
        title: '✅ Transfer Sukses',
        color: 3066993, // #2ECC71
        fields: [
          { name: '👤 Aktor', value: `<@${actorId}> *(${actorRoleText})*`, inline: true },
          { name: '🕒 Waktu', value: `<t:${unixTimestamp}:F>`, inline: true },
          { name: '⚡ Aksi', value: actionText, inline: false },
          { name: '📋 Detail Pemain', value: details, inline: false },
          { name: '📊 Kuota Transfer Tim', value: `\`${currentQuota} / 2 Digunakan\``, inline: false },
        ],
      },
    ],
  };
}

// 3. EMBED BALASAN LOG GAGAL DI CAMP TIM
export function createCampFailureEmbed(
  actorId: string,
  actionText: string,
  targetId: string | null,
  reason: string
) {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const fields: any[] = [
    { name: '👤 Aktor', value: `<@${actorId}>`, inline: true },
    { name: '🕒 Waktu', value: `<t:${unixTimestamp}:F>`, inline: true },
    { name: '⚡ Aksi yang Dicoba', value: actionText, inline: false },
  ];

  if (targetId) {
    fields.push({
      name: '🎯 Target',
      value: targetId.startsWith('<@') ? targetId : targetId.length === 18 || targetId.length === 19 ? `<@${targetId}>` : `\`${targetId}\``,
      inline: false,
    });
  }

  fields.push({ name: '⚠️ Alasan Ditolak', value: reason, inline: false });

  return {
    embeds: [
      {
        title: '❌ Transfer Gagal',
        color: 15158332, // #E74C3C
        fields,
      },
    ],
  };
}