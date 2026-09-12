import { discordAPI, formatWIBDate, getEmbedFooterText } from '../utils';

export interface BaseLogParams {
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
}

function createTeamDisplays(params: {
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
}) {
  return {
    teamADisplay: `${params.teamAEmoji ? params.teamAEmoji + ' ' : ''}**${params.teamAName}**`,
    teamBDisplay: `${params.teamBEmoji ? params.teamBEmoji + ' ' : ''}**${params.teamBName}**`,
  };
}

// 1. Log Penugasan Referee Awal (POST Baru)
export async function sendOrUpdateRefereeAssignmentLog(
  params: BaseLogParams & { staffDiscordId: string }
): Promise<string | null> {
  const { teamADisplay, teamBDisplay } = createTeamDisplays(params);

  const embedData = {
    title: '⚖️ Referee Assignment',
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0x00a8fc,
    fields: [
      { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
      {
        name: '📌 Match Channel',
        value: params.matchChannelId ? `<#${params.matchChannelId}>` : 'Belum tersedia',
        inline: false,
      },
    ],
    footer: { text: getEmbedFooterText() },
  };

  const payload = {
    content: `⚖️ <@${params.staffDiscordId}> ditugaskan sebagai **Referee**!`,
    embeds: [embedData],
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 2. Log Penugasan Streamer Awal (POST Baru)
export async function sendOrUpdateStreamerAssignmentLog(
  params: BaseLogParams & { staffDiscordId: string }
): Promise<string | null> {
  const { teamADisplay, teamBDisplay } = createTeamDisplays(params);

  const embedData = {
    title: '🎥 Streamer Assignment',
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0x9b59b6,
    fields: [
      { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
      {
        name: '📌 Match Channel',
        value: params.matchChannelId ? `<#${params.matchChannelId}>` : 'Belum tersedia',
        inline: false,
      },
    ],
    footer: { text: getEmbedFooterText() },
  };

  const payload = {
    content: `🎥 <@${params.staffDiscordId}> ditugaskan sebagai **Streamer**!`,
    embeds: [embedData],
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 3. Log Pergantian Staf (POST Reply ke Log Awal)
export async function sendReassignmentLog(
  params: BaseLogParams & {
    existingMsgId: string;
    roleType: 'REFEREE' | 'STREAMER';
    newStaffDiscordId: string;
    oldStaffDiscordId: string;
  }
): Promise<string | null> {
  const { teamADisplay, teamBDisplay } = createTeamDisplays(params);
  const isRef = params.roleType === 'REFEREE';
  const roleName = isRef ? 'Referee' : 'Streamer';
  const roleEmoji = isRef ? '⚖️' : '🎥';
  const embedColor = isRef ? 0x00a8fc : 0x9b59b6;

  const embedData = {
    title: `🔄 ${roleName} Re-Assignment`,
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: embedColor,
    fields: [
      { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
      {
        name: '📌 Match Channel',
        value: params.matchChannelId ? `<#${params.matchChannelId}>` : 'Belum tersedia',
        inline: false,
      },
    ],
    footer: { text: getEmbedFooterText() },
  };

  const payload = {
    content: `${roleEmoji} <@${params.newStaffDiscordId}> ditugaskan sebagai **${roleName}** menggantikan <@${params.oldStaffDiscordId}>!`,
    embeds: [embedData],
    message_reference: { message_id: params.existingMsgId },
  };

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}

// 4. Log Selesai Tugas Staf (POST Reply ke Log Awal - COMPLETED / HIJAU)
export async function sendCompletedAssignmentLog(
  params: BaseLogParams & {
    existingMsgId?: string;
    roleType: 'REFEREE' | 'STREAMER';
    staffDiscordId: string;
    scoreA?: number;
    scoreB?: number;
    streamLink?: string;
  }
): Promise<string | null> {
  const roleTitle = params.roleType === 'REFEREE' ? 'Referee' : 'Streamer';
  const { teamADisplay, teamBDisplay } = createTeamDisplays(params);

  const fields: any[] = [
    { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
  ];

  if (params.roleType === 'REFEREE') {
    const scoreA = params.scoreA ?? 0;
    const scoreB = params.scoreB ?? 0;
    const isWinA = scoreA > scoreB;
    const winnerName = isWinA ? params.teamAName : params.teamBName;
    const winScore = Math.max(scoreA, scoreB);
    const loseScore = Math.min(scoreA, scoreB);

    fields.push({
      name: '🏆 Hasil Pertandingan',
      value: `**${winScore}-${loseScore} (${winnerName} win)**`,
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
    footer: { text: getEmbedFooterText() },
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

// 5. Log Pembatalan Tugas Staf (POST Reply ke Log Awal - CANCELLED / MERAH)
export async function sendCancelledAssignmentLog(
  params: BaseLogParams & {
    existingMsgId?: string;
    staffDiscordId: string;
    roleType?: 'REFEREE' | 'STREAMER';
  }
): Promise<string | null> {
  const { teamADisplay, teamBDisplay } = createTeamDisplays(params);
  const roleTitle = params.roleType === 'REFEREE' ? 'Referee' : 'Streamer';

  const embedData = {
    title: `❌ ${roleTitle} Assignment - CANCELLED`,
    description: `${params.groupName || 'Group Stage'} • ${params.weekName || 'Week 1'}\n${teamADisplay} **vs** ${teamBDisplay}`,
    color: 0xed4245,
    fields: [
      { name: '📅 Waktu Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
      { name: '📝 Status', value: 'Batal bertugas / penugasan dibatalkan.', inline: false },
    ],
    footer: { text: getEmbedFooterText() },
  };

  const payload: any = {
    content: `<@${params.staffDiscordId}> batal bertugas sebagai **${roleTitle}**!`,
    embeds: [embedData],
  };

  if (params.existingMsgId) {
    payload.message_reference = { message_id: params.existingMsgId };
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}
