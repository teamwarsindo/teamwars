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
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' at ' +
    d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
      .replace('.', ':') +
    ' WIB'
  );
}

// ⚖️ LOG REFEREE ASSIGNMENT (AWAL)
export async function sendOrUpdateRefereeAssignmentLog(params: AssignmentLogParams): Promise<string | null> {
  if (!params.channelId || !params.staffDiscordId) return null;

  const channelTag = params.matchChannelId ? `<#${params.matchChannelId}>` : '`Channel Belum Ada`';
  const t1 = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const t2 = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  if (params.existingMsgId) {
    const cancelPayload = {
      content: `~~⚖️ <@${params.staffDiscordId}>~~ ❌ **[PENUGASAN DIPERBARUI]**`,
      embeds: [
        {
          title: '⚖️ Referee Assignment - UPDATED',
          description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}\n\n⚠️ *Status: Penugasan atau jadwal ini telah diperbarui pada pesan log terbaru di bawah.*`,
          color: 0x95a5a6,
        },
      ],
    };
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', cancelPayload).catch(() => null);
  }

  const newPayload = {
    content: `⚖️ <@${params.staffDiscordId}> ditugaskan sebagai **Referee**!`,
    embeds: [
      {
        title: '⚖️ Referee Assignment',
        description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}`,
        color: 0x3498db,
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

// 🎥 LOG STREAMER ASSIGNMENT (AWAL)
export async function sendOrUpdateStreamerAssignmentLog(params: AssignmentLogParams): Promise<string | null> {
  if (!params.channelId || !params.staffDiscordId) return null;

  const channelTag = params.matchChannelId ? `<#${params.matchChannelId}>` : '`Channel Belum Ada`';
  const t1 = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const t2 = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  if (params.existingMsgId) {
    const cancelPayload = {
      content: `~~🎥 <@${params.staffDiscordId}>~~ ❌ **[PENUGASAN DIPERBARUI]**`,
      embeds: [
        {
          title: '🎥 Streamer Assignment - UPDATED',
          description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}\n\n⚠️ *Status: Penugasan atau jadwal ini telah diperbarui pada pesan log terbaru di bawah.*`,
          color: 0x95a5a6,
        },
      ],
    };
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', cancelPayload).catch(() => null);
  }

  const newPayload = {
    content: `🎥 <@${params.staffDiscordId}> ditugaskan sebagai **Streamer**!`,
    embeds: [
      {
        title: '🎥 Streamer Assignment',
        description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}`,
        color: 0xe74c3c,
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

// 🏁 LOG COMPLETED REPLY DI #CH_ASSIGN
export async function sendCompletedAssignmentLog(params: {
  channelId: string;
  existingMsgId: string;
  roleType: 'REFEREE' | 'STREAMER';
  staffDiscordId: string;
  matchId: string;
  groupName?: string;
  weekName?: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  matchDateIso?: string;
  scoreA?: number;
  scoreB?: number;
  streamLink?: string;
}): Promise<string | null> {
  if (!params.channelId || !params.existingMsgId) return null;

  const roleTitle = params.roleType === 'REFEREE' ? 'Referee' : 'Streamer';
  const t1 = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const t2 = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  const fields: any[] = [
    { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
  ];

  if (params.roleType === 'REFEREE') {
    const sA = params.scoreA ?? 0;
    const sB = params.scoreB ?? 0;
    let winnerText = '';
    if (sA > sB) winnerText = `${t1} defeated ${t2} with a score of **${sA}-${sB}**`;
    else if (sB > sA) winnerText = `${t2} defeated ${t1} with a score of **${sB}-${sA}**`;
    else winnerText = `${t1} tied with ${t2} with a score of **${sA}-${sB}**`;

    fields.push({ name: '🏆 Hasil Pertandingan', value: winnerText, inline: false });
  } else {
    const streamUrl = params.streamLink || 'Belum tersedia';
    fields.push({ name: '📺 Link Streaming', value: streamUrl, inline: false });
  }

  const payload = {
    content: `Terimakasih <@${params.staffDiscordId}> telah bertugas sebagai ${roleTitle}!`,
    message_reference: {
      message_id: params.existingMsgId,
    },
    embeds: [
      {
        title: `✅ ${roleTitle} Assignment - COMPLETED`,
        description: `${params.groupName || 'Group A'} • ${params.weekName || 'Week 1'}\n${t1} vs ${t2}`,
        color: 0x2ecc71,
        fields,
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 📢 EMBED SCORE RESMI KE #CH_SCORE (SANGAT SIMPEL)
export async function sendOfficialScoreLog(params: {
  channelId: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  scoreA: number;
  scoreB: number;
}): Promise<string | null> {
  if (!params.channelId) return null;

  const emojiA = params.teamAEmoji ? params.teamAEmoji + ' ' : '';
  const emojiB = params.teamBEmoji ? params.teamBEmoji + ' ' : '';

  let scoreSummary = '';
  if (params.scoreA > params.scoreB) {
    scoreSummary = `${emojiA}**${params.teamAName}** defeated ${emojiB}**${params.teamBName}** with a score of **${params.scoreA}-${params.scoreB}**`;
  } else if (params.scoreB > params.scoreA) {
    scoreSummary = `${emojiB}**${params.teamBName}** defeated ${emojiA}**${params.teamAName}** with a score of **${params.scoreB}-${params.scoreA}**`;
  } else {
    scoreSummary = `${emojiA}**${params.teamAName}** tied with ${emojiB}**${params.teamBName}** with a score of **${params.scoreA}-${params.scoreB}**`;
  }

  const payload = {
    embeds: [
      {
        description: scoreSummary,
        color: 0x2ecc71,
      },
    ],
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}