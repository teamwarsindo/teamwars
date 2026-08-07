import { discordAPI } from '../utils';

export interface AssignmentLogParams {
  channelId: string;
  matchId: string;
  weekName?: string;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  matchChannelId?: string;
  matchDateIso?: string;
  staffName?: string;
  staffDiscordId?: string;
  existingMsgId?: string | null;
}

function formatWIBDate(dateIso?: string): string {
  if (!dateIso) return 'TBA';
  const d = new Date(dateIso);
  return d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).replace('.', ':') + ' WIB';
}

// ⚖️ LOG REFEREE
export async function sendOrUpdateRefereeAssignmentLog(params: AssignmentLogParams): Promise<string | null> {
  if (!params.channelId || !params.staffDiscordId) return null;

  const channelTag = params.matchChannelId ? `<#${params.matchChannelId}>` : '`Channel Belum Ada`';
  const t1 = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const t2 = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  // 1. Edit Log Lama jika Dibatalkan / Diperbarui
  if (params.existingMsgId) {
    const cancelPayload = {
      content: `~~⚖️ <@${params.staffDiscordId}>~~ ❌ **[PENUGASAN DIBATALKAN / DIBAHARUI]**`,
      embeds: [
        {
          title: '⚖️ Referee Assignment - CANCELLED / UPDATED',
          description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}\n\n⚠️ *Status: Penugasan atau jadwal ini telah diperbarui pada pesan log terbaru di bawah.*`,
          color: 0x95a5a6, // Grey
        },
      ],
    };
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', cancelPayload).catch(() => null);
  }

  // 2. Kirim Log Baru
  const newPayload = {
    content: `⚖️ <@${params.staffDiscordId}> ditugaskan sebagai **Referee**!`,
    embeds: [
      {
        title: '⚖️ Referee Assignment',
        description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}`,
        color: 0x3498db, // Blue
        fields: [
          { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
          { name: '📌 Match Channel', value: channelTag, inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', newPayload).catch(() => null);
  return res?.id || null;
}

// 🎥 LOG STREAMER
export async function sendOrUpdateStreamerAssignmentLog(params: AssignmentLogParams): Promise<string | null> {
  if (!params.channelId || !params.staffDiscordId) return null;

  const channelTag = params.matchChannelId ? `<#${params.matchChannelId}>` : '`Channel Belum Ada`';
  const t1 = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const t2 = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  // 1. Edit Log Lama jika Dibatalkan / Diperbarui
  if (params.existingMsgId) {
    const cancelPayload = {
      content: `~~🎥 <@${params.staffDiscordId}>~~ ❌ **[PENUGASAN DIBATALKAN / DIBAHARUI]**`,
      embeds: [
        {
          title: '🎥 Streamer Assignment - CANCELLED / UPDATED',
          description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}\n\n⚠️ *Status: Penugasan atau jadwal ini telah diperbarui pada pesan log terbaru di bawah.*`,
          color: 0x95a5a6, // Grey
        },
      ],
    };
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', cancelPayload).catch(() => null);
  }

  // 2. Kirim Log Baru
  const newPayload = {
    content: `🎥 <@${params.staffDiscordId}> ditugaskan sebagai **Streamer**!`,
    embeds: [
      {
        title: '🎥 Streamer Assignment',
        description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}`,
        color: 0xe74c3c, // Red
        fields: [
          { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
          { name: '📌 Match Channel', value: channelTag, inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', newPayload).catch(() => null);
  return res?.id || null;
}
