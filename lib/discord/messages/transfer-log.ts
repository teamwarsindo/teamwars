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

// 1. BROADCAST TRANSFER NEWS LOG (FORMAT: <:kodeTim:emojiId>)
export async function sendTransferNewsLog(params: TransferLogParams): Promise<string | null> {
  const { teamName, teamKode, teamEmojiId, teamHex, action, targetIgn, oldIdDl, newIdDl } = params;
  const channelId = DISCORD_CONFIG.CH_LOG_TRANSFER;

  if (!channelId) return null;

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
    console.error(`[TRANSFER LOG ERROR] Gagal kirim transfer log untuk tim ${teamName}:`, error);
    return null;
  }
}

// 2. EMBED BALASAN INTERAKSI DI CAMP TIM (RINGKAS)
export function createCampSuccessReply(message: string, currentQuota: number) {
  const quotaNum = Number(currentQuota) || 0;
  const remainingQuota = Math.max(0, 2 - quotaNum);

  return {
    embeds: [
      {
        description: `✅ ${message}\n*Sisa Kuota Transfer: **${remainingQuota} / 2***`,
        color: hexToDecimal('#2ecc71'),
      },
    ],
  };
}

export function createCampFailureReply(reason: string) {
  return {
    embeds: [
      {
        description: `❌ **Gagal:** ${reason}`,
        color: hexToDecimal('#e74c3c'),
      },
    ],
  };
}
