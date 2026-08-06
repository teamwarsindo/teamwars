import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';

export interface ScheduleMatch {
  matchDateIso: string;
  dateStr: string;
  timeStr: string;
  team1Emoji?: string;
  team1Name: string;
  team2Emoji?: string;
  team2Name: string;
}

// Helper Format Timestamp WIB Presisi (Asia/Jakarta)
function formatDiscordStyleTimeWIB(dateObj = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).formatToParts(dateObj);

  const p: Record<string, string> = {};
  parts.forEach((part) => {
    p[part.type] = part.value;
  });

  return `${p.day} ${p.month} ${p.year} at ${p.hour}:${p.minute} WIB`;
}

// 🟢 PERBAIKAN: HAPUS HANYA 3 EMBED UTAMA (JANGAN HAPUS LAST UPDATED)
export async function deleteWeeklyScheduleAndRecap(params: {
  channelId: string;
  existingMsgIds?: {
    recapMsgId?: string;
    groupAMsgId?: string;
    groupBMsgId?: string;
    lastUpdatedMsgId?: string;
  };
}) {
  if (!params.channelId || !params.existingMsgIds) return;

  const { recapMsgId, groupAMsgId, groupBMsgId } = params.existingMsgIds;

  if (recapMsgId) await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'DELETE').catch(() => null);
  if (groupAMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupAMsgId}`, 'DELETE').catch(() => null);
  if (groupBMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupBMsgId}`, 'DELETE').catch(() => null);
}

export async function sendOrUpdateWeeklyScheduleAndRecap(params: {
  channelId: string;
  weekName: string;
  weekDateRangeStr: string;
  dailyMatchCounts: Array<{
    dateFormatted: string;
    count: number;
  }>;
  groupASchedules: Array<ScheduleMatch>;
  groupBSchedules: Array<ScheduleMatch>;
  existingMsgIds?: {
    recapMsgId?: string;
    groupAMsgId?: string;
    groupBMsgId?: string;
    lastUpdatedMsgId?: string;
  };
  oldLastUpdatedMsgId?: string;
}): Promise<{ recapMsgId: string | null; groupAMsgId: string | null; groupBMsgId: string | null; lastUpdatedMsgId: string | null }> {
  if (!params.channelId) {
    return { recapMsgId: null, groupAMsgId: null, groupBMsgId: null, lastUpdatedMsgId: null };
  }

  const defaultFooter = { text: 'Team Wars Indonesia Season 7' };

  const buildGroupDescription = (schedules: Array<ScheduleMatch>): string => {
    let desc = 'Penyesuaian jadwal setelah permintaan reschedule\n\n';

    if (!schedules || schedules.length === 0) {
      desc += '_Belum ada jadwal terkonfirmasi._';
      return desc;
    }

    const sorted = [...schedules].sort((a, b) => new Date(a.matchDateIso).getTime() - new Date(b.matchDateIso).getTime());

    const matchLines = sorted.map((m) => {
      const t1 = `${m.team1Emoji ? m.team1Emoji + ' ' : ''}**${m.team1Name}**`;
      const t2 = `${m.team2Emoji ? m.team2Emoji + ' ' : ''}**${m.team2Name}**`;
      return `${t1} vs ${t2}\n${m.dateStr} at ${m.timeStr}`;
    });

    return desc + matchLines.join('\n\n');
  };

  // 1. REKAP MATCH FIELDS
  const recapFields = (params.dailyMatchCounts || []).map((day, idx) => {
    let statusText = '';
    if (day.count >= 3) {
      statusText = `🔴 ${day.count}/3 Match (Penuh)`;
    } else if (day.count === 2) {
      statusText = `🟡 ${day.count}/3 Match (Sisa 1)`;
    } else {
      const remaining = 3 - day.count;
      statusText = `🟢 ${day.count}/3 Match (Sisa ${remaining})`;
    }

    const rawDateStr = day.dateFormatted?.trim() || `Hari ${idx + 1}`;
    return {
      name: `📅 ${rawDateStr}`.slice(0, 24),
      value: statusText.slice(0, 25),
      inline: false,
    };
  });

  const adminMention = DISCORD_CONFIG.ROLE_ADMIN ? `<@&${DISCORD_CONFIG.ROLE_ADMIN}>` : '@Admin';
  const contentText = `${adminMention} **${params.weekName}**\n${params.weekDateRangeStr}`;

  const recapPayload = {
    content: contentText,
    embeds: [
      {
        title: `📊 Schedule Recap - ${params.weekName}`,
        color: 0x9b59b6,
        description: 'Ketersediaan match per hari sebagai acuan reschedule.',
        fields: recapFields,
        footer: defaultFooter,
      },
    ],
  };

  const groupAPayload = {
    embeds: [
      {
        title: `📊 Schedule Group A - ${params.weekName}`,
        color: 0x3498db,
        description: buildGroupDescription(params.groupASchedules),
        footer: defaultFooter,
      },
    ],
  };

  const groupBPayload = {
    embeds: [
      {
        title: `📊 Schedule Group B - ${params.weekName}`,
        color: 0xe74c3c,
        description: buildGroupDescription(params.groupBSchedules),
        footer: defaultFooter,
      },
    ],
  };

  let recapMsgId = params.existingMsgIds?.recapMsgId || null;
  let groupAMsgId = params.existingMsgIds?.groupAMsgId || null;
  let groupBMsgId = params.existingMsgIds?.groupBMsgId || null;

  // 2. PATCH ATAU POST UNTUK 3 EMBED UTAMA
  if (recapMsgId) {
    const patchRes = await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'PATCH', recapPayload).catch(() => null);
    if (!patchRes) {
      const postRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', recapPayload).catch(() => null);
      recapMsgId = postRes?.id || null;
    }
  } else {
    const postRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', recapPayload).catch(() => null);
    recapMsgId = postRes?.id || null;
  }

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

  // 3. CLEANUP PESAN LAST UPDATED LAMA JIKA ADA
  if (params.oldLastUpdatedMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.oldLastUpdatedMsgId}`, 'DELETE').catch(() => null);
  }

  if (params.existingMsgIds?.lastUpdatedMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgIds.lastUpdatedMsgId}`, 'DELETE').catch(() => null);
  }

  // 4. PESAN KE-4: LAST UPDATED EMBED
  const lastUpdatedPayload = {
    embeds: [
      {
        description: `⏱️ **Last Updated:** ${formatDiscordStyleTimeWIB()}`,
        color: 0x2b2d31,
      },
    ],
  };

  const lastUpdatedRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', lastUpdatedPayload).catch(() => null);

  return {
    recapMsgId,
    groupAMsgId,
    groupBMsgId,
    lastUpdatedMsgId: lastUpdatedRes?.id || null,
  };
                                           }
