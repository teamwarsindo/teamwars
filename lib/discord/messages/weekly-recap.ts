import { discordAPI, getEmbedFooterText } from '../utils';
import { DIVISION_MAP } from '@/app/tournament/_library';

export interface ScheduleMatch {
  matchDateIso: string;
  dateStr: string;
  timeStr: string;
  team1Emoji?: string;
  team1Name: string;
  team2Emoji?: string;
  team2Name: string;
}

export async function deleteWeeklyScheduleAndRecap(params: {
  channelId: string;
  existingMsgIds?: {
    recapMsgId?: string;
    groupAMsgId?: string;
    groupBMsgId?: string;
  };
  deleteRecapToo?: boolean;
}) {
  if (!params.channelId || !params.existingMsgIds) return;

  const { recapMsgId, groupAMsgId, groupBMsgId } = params.existingMsgIds;

  if (groupAMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupAMsgId}`, 'DELETE').catch(() => null);
  if (groupBMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupBMsgId}`, 'DELETE').catch(() => null);
  if (params.deleteRecapToo && recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'DELETE').catch(() => null);
  }
}

export async function sendOrUpdateWeeklyScheduleAndRecap(params: {
  channelId: string;
  weekName: string;
  weekDateRangeStr?: string;
  dailyMatchCounts?: Array<{
    dateKey: string;
    dateFormatted: string;
    count: number;
  }>;
  groupASchedules: Array<ScheduleMatch>;
  groupBSchedules: Array<ScheduleMatch>;
  existingMsgIds?: {
    recapMsgId?: string;
    groupAMsgId?: string;
    groupBMsgId?: string;
  };
  oldRecapMsgId?: string;
}): Promise<{ recapMsgId: string | null; groupAMsgId: string | null; groupBMsgId: string | null }> {
  if (!params.channelId) {
    return { recapMsgId: null, groupAMsgId: null, groupBMsgId: null };
  }

  const buildGroupDescription = (schedules: Array<ScheduleMatch>): string => {
    let desc = 'Penyesuaian jadwal setelah permintaan reschedule\n\n';

    if (!schedules || schedules.length === 0) {
      desc += '_Belum ada jadwal terkonfirmasi._';
      return desc;
    }

    const sorted = [...schedules].sort((a, b) => new Date(a.matchDateIso).getTime() - new Date(b.matchDateIso).getTime());

    const matchLines = sorted.map((m) => {
      const e1 = m.team1Emoji ? `${m.team1Emoji} ` : '';
      const e2 = m.team2Emoji ? `${m.team2Emoji} ` : '';
      return `${e1}**${m.team1Name}** vs ${e2}**${m.team2Name}**\n${m.dateStr} at ${m.timeStr}`;
    });

    return desc + matchLines.join('\n\n');
  };

  // Content Text & Payload Group A
  const groupAContent = `# ⚔️ Group Stage - ${params.weekName}\n@everyone`;
  const groupAPayload = {
    content: groupAContent,
    embeds: [
      {
        title: `📊 Schedule ${DIVISION_MAP.GROUP_A}`,
        color: 0x3498db,
        description: buildGroupDescription(params.groupASchedules),
        footer: { text: getEmbedFooterText() },
      },
    ],
  };

  // Payload Group B
  const groupBPayload = {
    embeds: [
      {
        title: `📊 Schedule ${DIVISION_MAP.GROUP_B}`,
        color: 0xe74c3c,
        description: buildGroupDescription(params.groupBSchedules),
        footer: { text: getEmbedFooterText() },
      },
    ],
  };

  let groupAMsgId = params.existingMsgIds?.groupAMsgId || null;
  let groupBMsgId = params.existingMsgIds?.groupBMsgId || null;
  let recapMsgId = params.existingMsgIds?.recapMsgId || null;

  // 1. GROUP A: PATCH / POST
  if (groupAMsgId) {
    const patchRes = await discordAPI(`/channels/${params.channelId}/messages/${groupAMsgId}`, 'PATCH', groupAPayload).catch(() => null);
    if (!patchRes) {
      const postRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', groupAPayload).catch(() => null);
      groupAMsgId = postRes?.id || null;
    }
  } else {
    const postRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', groupAPayload).catch(() => null);
    groupAMsgId = postRes?.id || null;
  }

  // 2. GROUP B: PATCH / POST
  if (groupBMsgId) {
    const patchRes = await discordAPI(`/channels/${params.channelId}/messages/${groupBMsgId}`, 'PATCH', groupBPayload).catch(() => null);
    if (!patchRes) {
      const postRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', groupBPayload).catch(() => null);
      groupBMsgId = postRes?.id || null;
    }
  } else {
    const postRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', groupBPayload).catch(() => null);
    groupBMsgId = postRes?.id || null;
  }

  // 3. RECAP: Hapus pesan rekap lama jika tersisa & cegah pengiriman baru
  if (recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'DELETE').catch(() => null);
  }
  if (params.oldRecapMsgId && params.oldRecapMsgId !== recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.oldRecapMsgId}`, 'DELETE').catch(() => null);
  }

  return {
    groupAMsgId,
    groupBMsgId,
    recapMsgId: null,
  };
                                           }
