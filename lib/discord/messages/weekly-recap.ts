import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';

export interface ScheduleMatch {
  matchDateIso: string;  // Untuk sorting kronologis
  dateStr: string;       // Contoh: "Rabu, 05 Aug 2026"
  timeStr: string;       // Contoh: "20:00 WIB"
  team1Emoji?: string;   // Format Discord Emoji: "<:name:id>" atau "🛡️"
  team1Name: string;     // Contoh: "FC Team"
  team2Emoji?: string;   // Format Discord Emoji: "<:name:id>" atau "⚔️"
  team2Name: string;     // Contoh: "DS Esports"
}

// Helper Format Timestamp (06 Aug 2026 at 13:15 WIB)
function formatDiscordStyleTime(dateObj = new Date()): string {
  const day = dateObj.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} at ${hours}:${minutes} WIB`;
}

export async function sendOrUpdateWeeklyScheduleAndRecap(params: {
  channelId: string;
  weekName: string;
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
}): Promise<{ recapMsgId: string | null; groupAMsgId: string | null; groupBMsgId: string | null; lastUpdatedMsgId: string | null }> {
  if (!params.channelId) {
    return { recapMsgId: null, groupAMsgId: null, groupBMsgId: null, lastUpdatedMsgId: null };
  }

  const defaultFooter = { text: 'Team Wars Indonesia Season 7' };

  // Helper Pembuat Deskripsi Jadwal Group (Diurutkan berdasarkan Waktu)
  const buildGroupDescription = (schedules: Array<ScheduleMatch>): string => {
    let desc = 'Penyesuaian jadwal setelah permintaan reschedule\n\n';

    if (!schedules || schedules.length === 0) {
      desc += '_Belum ada jadwal terkonfirmasi._';
      return desc;
    }

    // Urutkan Kronologis
    const sorted = [...schedules].sort((a, b) => new Date(a.matchDateIso).getTime() - new Date(b.matchDateIso).getTime());

    const matchLines = sorted.map((m) => {
      const t1 = `${m.team1Emoji ? m.team1Emoji + ' ' : ''}**${m.team1Name}**`;
      const t2 = `${m.team2Emoji ? m.team2Emoji + ' ' : ''}**${m.team2Name}**`;
      return `📅 **${m.dateStr} at ${m.timeStr}**\n${t1} vs ${t2}`;
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

  // Tag Admin Role di Content
  const adminMention = DISCORD_CONFIG.ROLE_ADMIN ? `<@&${DISCORD_CONFIG.ROLE_ADMIN}>` : '@Admin';

  const recapPayload = {
    content: `📢 ${adminMention} **Pemberitahuan Rekap & Jadwal Pertandingan Minggu Ini**`,
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

  // Pesan 1: Recap
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

  // Pesan 2: Group A
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

  // Pesan 3: Group B
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

  // 3. PESAN KE-4: LAST UPDATED EMBED (HAPUS PESAN LAMA LALU KIRIM BARU)
  if (params.existingMsgIds?.lastUpdatedMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgIds.lastUpdatedMsgId}`, 'DELETE').catch(() => null);
  }

  const lastUpdatedPayload = {
    embeds: [
      {
        description: `⏱️ **Last Updated:** ${formatDiscordStyleTime()}`,
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
