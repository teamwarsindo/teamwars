import { discordAPI } from '../utils';

function formatWIBDate(dateIso?: string): string {
  if (!dateIso) return 'Belum ditentukan';
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return 'Belum ditentukan';
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
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

// 1. Log Penugasan Referee Baru
export async function sendOrUpdateRefereeAssignmentLog(params: {
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
  staffName: string;
  staffDiscordId: string;
  existingMsgId?: string;
}): Promise<string | null> {
  const teamADisplay = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const teamBDisplay = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  const embedData = {
    title: '⚖️ Referee Assignment',
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0x00a8fc,
    fields: [
      {
        name: '📅 Waktu Pertandingan',
        value: formatWIBDate(params.matchDateIso),
        inline: false,
      },
      {
        name: '📌 Match Channel',
        value: params.matchChannelId ? `<#${params.matchChannelId}>` : 'Belum tersedia',
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const payload = {
    content: `⚖️ <@${params.staffDiscordId}> ditugaskan sebagai **Referee**!`,
    embeds: [embedData],
  };

  if (params.existingMsgId) {
    const res = await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', payload).catch(() => null);
    if (res?.id) return res.id;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 2. Log Penugasan Streamer Baru
export async function sendOrUpdateStreamerAssignmentLog(params: {
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
  staffName: string;
  staffDiscordId: string;
  existingMsgId?: string;
}): Promise<string | null> {
  const teamADisplay = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const teamBDisplay = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  const embedData = {
    title: '🎥 Streamer Assignment',
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0x9b59b6,
    fields: [
      {
        name: '📅 Waktu Pertandingan',
        value: formatWIBDate(params.matchDateIso),
        inline: false,
      },
      {
        name: '📌 Match Channel',
        value: params.matchChannelId ? `<#${params.matchChannelId}>` : 'Belum tersedia',
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const payload = {
    content: `🎥 <@${params.staffDiscordId}> ditugaskan sebagai **Streamer**!`,
    embeds: [embedData],
  };

  if (params.existingMsgId) {
    const res = await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', payload).catch(() => null);
    if (res?.id) return res.id;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 3. Log Penugasan Selesai (Reply ke Pesan Awal)
export async function sendCompletedAssignmentLog(params: {
  channelId: string;
  existingMsgId?: string;
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
  const roleTitle = params.roleType === 'REFEREE' ? 'Referee' : 'Streamer';
  const teamADisplay = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const teamBDisplay = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  const fields: any[] = [
    {
      name: '📅 Waktu Pertandingan',
      value: formatWIBDate(params.matchDateIso),
      inline: false,
    },
  ];

  if (params.roleType === 'REFEREE') {
    const scoreA = params.scoreA ?? 0;
    const scoreB = params.scoreB ?? 0;
    const isWinA = scoreA > scoreB;
    const winnerDisplay = isWinA ? teamADisplay : teamBDisplay;
    const loserDisplay = isWinA ? teamBDisplay : teamADisplay;
    const winScore = Math.max(scoreA, scoreB);
    const loseScore = Math.min(scoreA, scoreB);

    fields.push({
      name: '🏆 Hasil Pertandingan',
      value: `${winnerDisplay} defeated ${loserDisplay}\nwith a score of **${winScore}-${loseScore}**`,
      inline: false,
    });
  } else if (params.streamLink) {
    fields.push({
      name: '📺 Live Stream',
      value: params.streamLink,
      inline: false,
    });
  }

  const embedData = {
    title: `✅ ${roleTitle} Assignment - COMPLETED`,
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0x2ecc71,
    fields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const payload: any = {
    content: `Terimakasih <@${params.staffDiscordId}> telah bertugas sebagai **${roleTitle}**!`,
    embeds: [embedData],
  };

  if (params.existingMsgId) {
    payload.message_reference = { message_id: params.existingMsgId };
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 4. Log Pembatalan Penugasan (Reply ke Pesan Awal)
export async function sendCancelledAssignmentLog(params: {
  channelId: string;
  existingMsgId?: string;
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
  reason: string;
}): Promise<string | null> {
  const roleTitle = params.roleType === 'REFEREE' ? 'Referee' : 'Streamer';
  const teamADisplay = `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`;
  const teamBDisplay = `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`;

  const embedData = {
    title: `❌ ${roleTitle} Assignment - CANCELLED`,
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0xed4245,
    fields: [
      {
        name: '📅 Waktu Pertandingan',
        value: formatWIBDate(params.matchDateIso),
        inline: false,
      },
      {
        name: '📝 Alasan',
        value: params.reason || 'Tidak ada alasan yang disertakan.',
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const payload: any = {
    content: `Maaf <@${params.staffDiscordId}> berhalangan bertugas sebagai **${roleTitle}**!`,
    embeds: [embedData],
  };

  if (params.existingMsgId) {
    payload.message_reference = { message_id: params.existingMsgId };
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 5. Score Log Resmi ke #CH_SCORE (#schedule-results)
export async function sendOfficialScoreLog(params: {
  channelId: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  scoreA: number;
  scoreB: number;
}): Promise<string | null> {
  const isTeamAWin = params.scoreA > params.scoreB;
  const winnerName = isTeamAWin ? params.teamAName : params.teamBName;
  const loserName = isTeamAWin ? params.teamBName : params.teamAName;
  const winnerEmoji = isTeamAWin ? params.teamAEmoji : params.teamBEmoji;
  const loserEmoji = isTeamAWin ? params.teamBEmoji : params.teamAEmoji;

  const winScore = Math.max(params.scoreA, params.scoreB);
  const loseScore = Math.min(params.scoreA, params.scoreB);

  const winnerDisplay = `${winnerEmoji ? winnerEmoji + ' ' : ''}**${winnerName}**`;
  const loserDisplay = `${loserEmoji ? loserEmoji + ' ' : ''}**${loserName}**`;

  const embedData = {
    description: `${winnerDisplay} defeated ${loserDisplay}\nwith a score of **${winScore}-${loseScore}**`,
    color: 0x22c55e, // Hijau emerald konsisten
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embedData],
  }).catch(() => null);

  return res?.id || null;
          }
