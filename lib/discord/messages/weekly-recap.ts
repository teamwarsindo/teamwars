import { discordAPI } from '../utils';

export interface ScheduleMatch {
  dateStr: string;       // Contoh: "Rabu, 05 Aug 2026"
  timeStr: string;       // Contoh: "20:00 WIB"
  team1Emoji?: string;   // Contoh: "<:fc:123456>" atau "🛡️"
  team1Name: string;     // Contoh: "FC Team"
  team2Emoji?: string;   // Contoh: "<:ds:123456>" atau "⚔️"
  team2Name: string;     // Contoh: "DS Esports"
}

// Helper Format Footer (Last Updated: 06 Aug 2026 at 12:42 WIB)
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
  weekName: string; // Contoh: "Week 1"
  dailyMatchCounts: Array<{
    dateFormatted: string; // Contoh: "Rabu, 05 Aug 2026"
    count: number;          // Jumlah match (0 - 3)
  }>;
  groupASchedules: Array<ScheduleMatch>;
  groupBSchedules: Array<ScheduleMatch>;
  existingMsgIds?: {
    recapMsgId?: string;
    groupAMsgId?: string;
    groupBMsgId?: string;
  };
}): Promise<{ recapMsgId: string | null; groupAMsgId: string | null; groupBMsgId: string | null }> {
  if (!params.channelId) return { recapMsgId: null, groupAMsgId: null, groupBMsgId: null };

  const footerText = `Last Updated: ${formatDiscordStyleTime()}`;

  // Helper Pembuat Deskripsi Jadwal Group (Lengkap dengan Jam)
  const buildGroupDescription = (schedules: Array<ScheduleMatch>): string => {
    let desc = 'Penyesuaian jadwal setelah permintaan reschedule\n\n';

    if (!schedules || schedules.length === 0) {
      desc += '_Belum ada jadwal terkonfirmasi._';
      return desc;
    }

    const matchLines = schedules.map((m) => {
      const t1 = `${m.team1Emoji ? m.team1Emoji + ' ' : ''}**${m.team1Name}**`;
      const t2 = `${m.team2Emoji ? m.team2Emoji + ' ' : ''}**${m.team2Name}**`;
      // Memastikan Tanggal + Jam Terpasang Presisi
      return `📅 **${m.dateStr} at ${m.timeStr}**\n${t1} vs ${t2}`;
    });

    return desc + matchLines.join('\n\n');
  };

  // --- 1. REKAP MATCH FIELDS ---
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

  const recapPayload = {
    content: '📢 **Pemberitahuan Rekap & Jadwal Pertandingan Minggu Ini**',
    embeds: [
      {
        title: `📊 Schedule Recap - ${params.weekName}`,
        color: 0x9b59b6,
        description: 'Ketersediaan match per hari sebagai acuan reschedule.',
        fields: recapFields,
        footer: { text: footerText },
      },
    ],
  };

  const groupAPayload = {
    embeds: [
      {
        title: `📊 Schedule Group A - ${params.weekName}`,
        color: 0x3498db,
        description: buildGroupDescription(params.groupASchedules),
        footer: { text: footerText },
      },
    ],
  };

  const groupBPayload = {
    embeds: [
      {
        title: `📊 Schedule Group B - ${params.weekName}`,
        color: 0xe74c3c,
        description: buildGroupDescription(params.groupBSchedules),
        footer: { text: footerText },
      },
    ],
  };

  let recapMsgId = params.existingMsgIds?.recapMsgId || null;
  let groupAMsgId = params.existingMsgIds?.groupAMsgId || null;
  let groupBMsgId = params.existingMsgIds?.groupBMsgId || null;

  // --- 2. EKSEKUSI MURNI PATCH (JIKA ID ADA) ATAU POST (JIKA PESAN BELUM ADA) ---

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

  // Pesan 2: Schedule Group A
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

  // Pesan 3: Schedule Group B
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

  return { recapMsgId, groupAMsgId, groupBMsgId };
        }
