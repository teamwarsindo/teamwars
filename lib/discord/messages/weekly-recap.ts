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

// 🔴 DELETE KHUSUS BAGIAN WEEK
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

  // Hapus Group A & Group B
  if (groupAMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupAMsgId}`, 'DELETE').catch(() => null);
  if (groupBMsgId) await discordAPI(`/channels/${params.channelId}/messages/${groupBMsgId}`, 'DELETE').catch(() => null);

  // Hapus Recap HANYA jika week ini memegang Recap aktif
  if (params.deleteRecapToo && recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${recapMsgId}`, 'DELETE').catch(() => null);
  }
}

export async function sendOrUpdateWeeklyScheduleAndRecap(params: {
  channelId: string;
  weekName: string; // Contoh: "Week 1"
  weekDateRangeStr: string; // Contoh: "Senin, 03 Aug 2026 - Minggu, 09 Aug 2026"
  dailyMatchCounts: Array<{
    dateKey: string; // YYYY-MM-DD
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
  oldRecapMsgId?: string; // ID Recap dari week sebelumnya jika pindah week
}): Promise<{ recapMsgId: string | null; groupAMsgId: string | null; groupBMsgId: string | null }> {
  if (!params.channelId) {
    return { recapMsgId: null, groupAMsgId: null, groupBMsgId: null };
  }

  // 1. FILTER TANGGAL SEKARANG (HAPUS TANGGAL YANG SUDAH LEWAT)
  const nowWIB = new Date();
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(nowWIB).split('-');
  const todayKey = `${year}-${month}-${day}`;

  const validDailyCounts = (params.dailyMatchCounts || []).filter((d) => d.dateKey >= todayKey);

  // Helper Pembuat Deskripsi Group (Tim Dulu, Baru Tanggal & Jam)
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

  // 2. REKAP FIELDS
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

  // Tag Admin & Baris Content Terpasang di Group A (Pesan 1)
  const adminMention = DISCORD_CONFIG.ROLE_ADMIN ? `<@&${DISCORD_CONFIG.ROLE_ADMIN}>` : '@Admin';
  const groupAContent = `${adminMention} **Group Stage - ${params.weekName}**\n${params.weekDateRangeStr}`;

  // 📦 PAYLOAD PESAN 1: GROUP A
  const groupAPayload = {
    content: groupAContent,
    embeds: [
      {
        title: `📊 Schedule Group A - ${params.weekName}`,
        color: 0x3498db,
        description: buildGroupDescription(params.groupASchedules),
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  // 📦 PAYLOAD PESAN 2: GROUP B
  const groupBPayload = {
    embeds: [
      {
        title: `📊 Schedule Group B - ${params.weekName}`,
        color: 0xe74c3c,
        description: buildGroupDescription(params.groupBSchedules),
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  // 📦 PAYLOAD PESAN 3: SCHEDULE RECAP (LAST UPDATED DIGABUNG DI FOOTER)
  const recapPayload = {
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

  // Hapus Recap Minggu Lalu jika Pindah Week
  if (params.oldRecapMsgId && params.oldRecapMsgId !== params.existingMsgIds?.recapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.oldRecapMsgId}`, 'DELETE').catch(() => null);
  }

  let groupAMsgId = params.existingMsgIds?.groupAMsgId || null;
  let groupBMsgId = params.existingMsgIds?.groupBMsgId || null;
  let recapMsgId = params.existingMsgIds?.recapMsgId || null;

  // 3. EKSEKUSI PATCH / POST DALAM URUTAN (GROUP A -> GROUP B -> RECAP)

  // Pesan 1: Group A
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

  // Pesan 2: Group B
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

  // Pesan 3: Schedule Recap
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

  return {
    groupAMsgId,
    groupBMsgId,
    recapMsgId,
  };
  }
