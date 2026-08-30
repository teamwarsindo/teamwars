import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export interface TransferLogParams {
  teamName: string;
  teamHex: string;
  action: 'OUT' | 'ADD' | 'EDIT_DL' | 'SET_LEADER' | 'SET_WAKIL';
  targetIgn: string;
  newIdDl?: string;
}

// 1. BROADCAST TRANSFER NEWS LOG (CH_LOG_TRANSFER)
export async function sendTransferNewsLog(params: TransferLogParams): Promise<string | null> {
  const { teamName, teamHex, action, targetIgn, newIdDl } = params;
  const channelId = DISCORD_CONFIG.CH_LOG_TRANSFER;

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
    fields.push({ name: '🎯 Target', value: `<@${targetId}>`, inline: false });
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
