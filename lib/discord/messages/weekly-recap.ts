import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';
import { DIVISION_MAP } from '@/lib/types/tournament';

export interface ScheduleMatch {
  matchDateIso: string;
  dateStr: string;
  timeStr: string;
  team1Emoji?: string;
  team1Name: string;
  team2Emoji?: string;
  team2Name: string;
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// 🟢 MAP EMOJI TIM DISCORD BERDASARKAN SLUG NAMA TIM
const TEAM_DISCORD_EMOJIS: Record<string, string> = {
  'anda-yakin': '🔥',
  'sakurasawa-fighters': '🌸',
  // Masukkan tag emoji Discord lengkap jika ada custom emoji, contoh: '<:slug:123456789>'
};

function resolveTeamEmoji(teamName: string, explicitEmoji?: string): string {
  if (explicitEmoji) return explicitEmoji;
  const slug = getTeamSlug(teamName);
  return TEAM_DISCORD_EMOJIS[slug] || '🛡️';
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
  weekDateRangeStr: string;
  dailyMatchCounts: Array<{
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

  const nowWIB = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(nowWIB).split('-');
  const todayKey = `${year}-${month}-${day}`;

  const validDailyCounts = (params.dailyMatchCounts || []).filter((d) => d.dateKey >= todayKey);

  const buildGroupDescription = (schedules: Array<ScheduleMatch>): string => {
    let desc = 'Penyesuaian jadwal setelah permintaan reschedule\n\n';

    if (!schedules || schedules.length === 0) {
      desc += '_Belum ada jadwal terkonfirmasi._';
      return desc;
    }

    const sorted = [...schedules].sort((a, b) => new Date(a.matchDateIso).getTime() - new Date(b.matchDateIso).getTime());

    const matchLines = sorted.map((m) => {
      const emoji1 = resolveTeamEmoji(m.team1Name, m.team1Emoji);
      const emoji2 = resolveTeamEmoji(m.team2Name, m.team2Emoji);

      const t1 = `${emoji1} **${m.team1Name}**`;
      const t2 = `${emoji2} **${m.team2Name}**`;
      return `${t1} vs ${t2}\n${m.dateStr} at ${m.timeStr}`;
    });

    return desc + matchLines.join('\n\n');
  };

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

  const groupAContent = `# ⚔️ Group Stage - ${params.weekName}\n🗓️ **${params.weekDateRangeStr}**\n\n@everyone`;
  const duelistMention = DISCORD_CONFIG.ROLE_DUELIST ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>` : '@Duelist';

  // 🟢 NAMA DIVISI MENGGUNAKAN DIVISION_MAP (Dinamis)
  const groupAPayload = {
    content: groupAContent,
    embeds: [
      {
        title: `📊 Schedule ${DIVISION_MAP.GROUP_A} - ${params.weekName}`,
        color: 0x3498db,
        description: buildGroupDescription(params.groupASchedules),
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  const groupBPayload = {
    embeds: [
      {
        title: `📊 Schedule ${DIVISION_MAP.GROUP_B} - ${params.weekName}`,
        color: 0xe74c3c,
        description: buildGroupDescription(params.groupBSchedules),
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  const recapPayload = {
    content: duelistMention,
    embeds: [
      {
        title: `📊 Schedule Recap - ${params.weekName}`,
        color: 0x9b59b6,
        description: 'Ketersediaan match per hari sebagai acuan reschedule.',
        fields: recapFields,
        footer: { text: `Last Updated: ${formatDiscordStyleTimeWIB()}` },
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

  // 🟢 3. RECAP: HAPUS RECAP LAMA & KIRIM BARU PADA POSISI PALING BAWAH
  if (recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'DELETE').catch(() => null);
  }
  if (params.oldRecapMsgId && params.oldRecapMsgId !== recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.oldRecapMsgId}`, 'DELETE').catch(() => null);
  }

  const postRecapRes = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', recapPayload).catch(() => null);
  recapMsgId = postRecapRes?.id || null;

  return {
    groupAMsgId,
    groupBMsgId,
    recapMsgId,
  };
    }
