import { DISCORD_CONFIG } from '../config';
import { discordAPI, hexToDecimal } from '../utils';

export interface AuditExecutor {
  tag: string;          // Format: <@userId>
  displayName: string;  // Server Nickname / Global Name
  username: string;     // Format: @username
}

export interface SendAuditLogParams {
  status: 'SUCCESS' | 'FAILED';
  executor: AuditExecutor;
  action: string;       // Contoh: "/transfer out", "/match submit"
  details: string[];    // Array bullet point rakitan dari log-templates
  errorMessage?: string;
}

function getWibDateString(): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date()) + ' WIB';
}

export async function sendAuditLog(params: SendAuditLogParams): Promise<string | null> {
  const channelId = DISCORD_CONFIG.CH_LOG;
  if (!channelId) return null;

  const { status, executor, action, details, errorMessage } = params;
  const isSuccess = status === 'SUCCESS';

  const title = isSuccess
    ? '📋 Audit Log Eksekusi'
    : '⚠️ Audit Log Eksekusi - Gagal';

  const color = isSuccess ? hexToDecimal('#2ecc71') : hexToDecimal('#e74c3c');

  const executorValue = [
    `• **Mention / Tag:** ${executor.tag}`,
    `• **Display Name:** ${executor.displayName}`,
    `• **Username:** ${executor.username.startsWith('@') ? executor.username : `@${executor.username}`}`,
  ].join('\n');

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: '👤 Eksekutor',
      value: executorValue,
      inline: false,
    },
    {
      name: '🕒 Waktu Eksekusi',
      value: `\`${getWibDateString()}\``,
      inline: true,
    },
    {
      name: '⚡ Aksi yang Dijalankan',
      value: `\`${action}\``,
      inline: true,
    },
  ];

  if (details && details.length > 0) {
    fields.push({
      name: isSuccess ? '📝 Detail Eksekusi' : '📝 Detail Terkait',
      value: details.join('\n'),
      inline: false,
    });
  }

  if (!isSuccess && errorMessage) {
    fields.push({
      name: '❌ Alasan Gagal / Ditolak',
      value: `\`\`\`\n${errorMessage}\n\`\`\``,
      inline: false,
    });
  }

  const payload = {
    embeds: [
      {
        title,
        color,
        fields,
        footer: {
          text: 'Team Wars Indonesia • System Audit',
        },
      },
    ],
  };

  try {
    const res = await discordAPI(`/channels/${channelId}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error('[AUDIT LOG ERROR]:', error);
    return null;
  }
    }
