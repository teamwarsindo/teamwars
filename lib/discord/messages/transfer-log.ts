import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export interface TransferLogParams {
  teamName: string;
  teamHex: string;
  action: 'OUT' | 'ADD' | 'EDIT_DL' | 'SET_LEADER' | 'SET_WAKIL';
  targetIgn: string;
  newIdDl?: string;
}

export async function sendTransferNewsLog(params: TransferLogParams): Promise<string | null> {
  const { teamName, teamHex, action, targetIgn, newIdDl } = params;
  const channelId = DISCORD_CONFIG.CH_TFNEWS;

  if (!channelId) return null;

  let description = '';

  switch (action) {
    case 'OUT':
      description = `**${teamName}** mengeluarkan **${targetIgn}** dari rosternya.`;
      break;
    case 'ADD':
      description = `**${teamName}** memasukkan **${targetIgn}** ke dalam rosternya.`;
      break;
    case 'EDIT_DL':
      description = `**${teamName}** mengganti ID Duel Links **${targetIgn}** (\`${newIdDl}\`).`;
      break;
    case 'SET_LEADER':
      description = `**${teamName}** mengganti Ketua menjadi **${targetIgn}**.`;
      break;
    case 'SET_WAKIL':
      description = `**${teamName}** mengganti Wakil Ketua menjadi **${targetIgn}**.`;
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