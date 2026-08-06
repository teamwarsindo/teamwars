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

// 🔴 DELETE KHUSUS BAGIAN WEEK
export async function deleteWeeklyScheduleAndRecap(params: {
  channelId: string;
  existingMsgIds?: {
    recapMsgId?: string;
    groupAMsgId?: string;
    groupBMsgId?: string;
    lastUpdatedMsgId?: string;
  };
  deleteRecapToo?: boolean; // True jika week ini memegang Recap aktif
}) {
  if (!params.channelId || !params.existingMsgIds) return;

  const { recapMsgId, groupAMsgId, groupBMsgId } = params.existingMsgIds;

  // Hapus Group A & Group B
  if (groupAMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupAMsgId}`, 'DELETE').catch(() => null);
  if (groupBMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupBMsgId}`, 'DELETE').catch(() => null);

  // Hapus Recap HANYA jika flag deleteRecapToo bernilai true
  if (params.deleteRecapToo && recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'DELETE').catch(() => null);
  }
}

export async function sendOrUpdateWeeklyScheduleAndRecap(params: {
  channelId: string;
  weekName: string;
  weekDateRangeStr: string;
  dailyMatchCounts: Array<{
    dateKey: string;      // YYYY-MM-DD
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
  oldRecapMsgId?: string;       // ID Recap dari week sebelumnya jika pindah week
  oldLastUpdatedMsgId?: string; // ID Last Updated sebelumnya
}): Promise<{ recapMsgId: string | null; groupAMsgId: string | null; groupBMsgId: string | null; lastUpdatedMsgId: string | null }> {
  if (!params.channelId) {
    return { recapMsgId: null, groupAMsgId: null, groupBMsgId: null, lastUpdatedMsgId: null };
  }

  const defaultFooter = { text: 'Team Wars Indonesia Season 7' };

  // 1. FILTER TANGGAL SEKARANG (HAPUS YANG SUDAH LEWAT)
  const nowWIB = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(nowWIB).split('-');
  const todayKey = `${year}-${month}-${day}`;

  const validDailyCounts = (params.dailyMatchCounts || []).filter((d) => d.dateKey >= todayKey);

  // Helper Pembuat Deskripsi Group
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

  // 2. BUILD FIELDS REKAP (TANGGAL LEWAT SUDAH TERFILTER)
  const recapFields = validDailyCounts.map((dayItem, idx) => {
    let statusText = '';
    if (dayItem.count >= 3) {
      statusText = `🔴 ${dayItem.count}/3 Match (Penuh)`;
    } else if (dayItem.count === 2) {
      statusText = `🟡 ${dayItem.count}/3 Match (Sisa 1)`;
    } else {
      const remaining = 3 - dayItem.count;
      statusText = `🟢 ${dayItem.count}/3 Match (Sisa ${remaining})`;
    }

    const rawDateStr = dayItem.dateFormatted?.trim() || `Hari ${idx + 1}`;
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

  // CLEANUP PESAN REKAP MINGGU SEBELUMNYA JIKA PINTAH WEEK
  if (params.oldRecapMsgId && params.oldRecapMsgId !== params.existingMsgIds?.recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.oldRecapMsgId}`, 'DELETE').catch(() => null);
  }

  let recapMsgId = params.existingMsgIds?.recapMsgId || null;
  let groupAMsgId = params.existingMsgIds?.groupAMsgId || null;
  let groupBMsgId = params.existingMsgIds?.groupBMsgId || null;

  // 3. EKSEKUSI PATCH / POST
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

  // CLEANUP PESAN LAST UPDATED LAMA
  if (params.oldLastUpdatedMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.oldLastUpdatedMsgId}`, 'DELETE').catch(() => null);
  }
  if (params.existingMsgIds?.lastUpdatedMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgIds.lastUpdatedMsgId}`, 'DELETE').catch(() => null);
  }

  // 4. EMBED LAST UPDATED DENGAN JAM WIB
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
      
