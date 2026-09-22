import {
  TOURNAMENT_RULES,
  formatDateTimeWIB,
  getMatchWeekNumber,
} from '@/app/tournament/_library';
import { getCheckMatchesComponent } from '../buttons/check-matches';
import { discordAPI } from '../utils';

export interface OpeningEmbedParams {
  matchId: string;
  matchDate: string;
  teamAName: string;
  teamBName: string;
  teamARoleId?: string;
  teamBRoleId?: string;
  groupName?: string;
  weekName?: string;
  refereeName?: string;
  isRescheduled?: boolean;
  channelId?: string;
  existingMessageId?: string | null;
  [key: string]: any;
}

export function createOpeningMessagePayload(params: OpeningEmbedParams) {
  const matchWeek = getMatchWeekNumber(params.matchDate);

  // Deteksi Playoff menggunakan konstanta resmi TOURNAMENT_RULES
  const isPlayoffStage =
    Boolean(params.groupName?.toLowerCase().includes('play')) ||
    Boolean(params.weekName?.toLowerCase().includes('play')) ||
    matchWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

  // Kuota harian dari TOURNAMENT_RULES
  const maxDailyQuota = isPlayoffStage
    ? TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF
    : TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_REGULAR;

  const matchDateObj = new Date(params.matchDate);
  const now = new Date();

  const isTodayMatch = matchDateObj.toDateString() === now.toDateString();
  const hasReferee = Boolean(params.refereeName && params.refereeName.trim() !== '');
  const isRescheduled = Boolean(params.isRescheduled);

  // Jadwal terkunci jika sudah di-reschedule, ada wasit, atau sudah hari-H pertandingan
  const isScheduleLocked = isRescheduled || hasReferee || isTodayMatch;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: '⚔️ Pertandingan',
      value: `**${params.teamAName}** vs **${params.teamBName}**`,
      inline: false,
    },
    {
      name: '📅 Waktu Pertandingan',
      value: `${formatDateTimeWIB(params.matchDate)} WIB`,
      inline: true,
    },
    {
      name: '🏆 Divisi / Fase',
      value: params.groupName || (isPlayoffStage ? 'Playoff Stage' : 'Regular Season'),
      inline: true,
    },
  ];

  if (hasReferee) {
    fields.push({
      name: '⚖️ Referee Bertugas',
      value: `**${params.refereeName}**`,
      inline: false,
    });
  }

  // 🔄 FIELD STATUS / PETUNJUK RESCHEDULE
  if (isScheduleLocked) {
    let statusText = '• Jadwal telah dikunci dan disahkan Admin.';

    if (isRescheduled) {
      statusText = '• Jadwal telah disepakati kedua tim & disahkan Admin.';
    } else if (hasReferee) {
      statusText = '• Jadwal telah dikunci dan Referee telah ditugaskan.';
    } else if (isTodayMatch) {
      statusText = '• Jadwal telah dikunci karena hari pertandingan telah tiba.';
    }

    fields.push({
      name: '📌 Status Jadwal',
      value: statusText,
      inline: false,
    });
  } else {
    fields.push({
      name: '📢 Ketentuan Reschedule',
      value:
        '• **Persetujuan:** Kedua tim wajib setuju.\n' +
        '• **Hari Tanding:** Rabu s.d. Minggu.\n' +
        `• **Batas Harian:** Maksimal ${maxDailyQuota} match per hari.\n` +
        '• **Cek Kuota:** Tekan tombol **📊 Cek Sisa Match Harian** di bawah.\n' +
        '• **Konfirmasi:** Wajib lapor ke **Admin Discord**.',
      inline: false,
    });
  }

  const roleMentions = [
    params.teamARoleId ? `<@&${params.teamARoleId}>` : `**${params.teamAName}**`,
    params.teamBRoleId ? `<@&${params.teamBRoleId}>` : `**${params.teamBName}**`,
  ].join(' vs ');

  const embed = {
    title: `📢 Match Announcement - ${params.weekName || `Week ${matchWeek}`}`,
    description: `Room koordinasi resmi antara ${roleMentions}.\nSilakan gunakan room ini untuk konfirmasi lineup dan koordinasi jadwal pertandingan.`,
    color: 0x5865f2,
    fields,
    footer: {
      text: 'Team Wars Indonesia • Season 7',
    },
    timestamp: new Date().toISOString(),
  };

  // Tombol cek match harian hanya dimunculkan jika jadwal belum dikunci
  const components = !isScheduleLocked ? getCheckMatchesComponent(params.matchId) : [];

  return {
    content: roleMentions,
    embeds: [embed],
    components,
  };
}

/**
 * Fungsi kirim atau edit pesan embed opening di Discord
 */
export async function sendOrUpdateOpeningEmbed(params: OpeningEmbedParams & { channelId: string; existingMessageId?: string | null }) {
  const payload = createOpeningMessagePayload(params);

  if (params.existingMessageId) {
    return await discordAPI(
      `/channels/${params.channelId}/messages/${params.existingMessageId}`,
      'PATCH',
      payload
    );
  }

  return await discordAPI(
    `/channels/${params.channelId}/messages`,
    'POST',
    payload
  );
}
