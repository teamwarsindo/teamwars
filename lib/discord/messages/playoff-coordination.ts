import { TOURNAMENT_RULES } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { getEmbedFooterText } from '../utils';

export interface PlayoffCoordinationMatchItem {
  teamAName: string;
  teamBName: string;
  kodeTimA?: string;
  kodeTimB?: string;
  emojiAId?: string;
  emojiBId?: string;
}

export interface PlayoffCoordinationMessageParams {
  stageTitle: string;
  matches: PlayoffCoordinationMatchItem[];
}

function resolveTeamEmoji(emojiId?: string, kodeTim?: string, teamName?: string): string {
  if (emojiId && /^\d{17,20}$/.test(emojiId.trim())) {
    const rawTag = (kodeTim || teamName || 'team')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 32);

    const safeTag = rawTag.length >= 2 ? rawTag : `${rawTag || 't'}_`;
    return `<:${safeTag}:${emojiId.trim()}> `;
  }

  return '';
}

export function getPlayoffCoordinationMessagePayload({
  stageTitle,
  matches,
}: PlayoffCoordinationMessageParams) {
  // Susun format matchup dengan emoji tim, 'VS' kapital, dan spacer transparan antar-jadwal
  const matchScheduleContent =
    matches.length > 0
      ? matches
          .map((m) => {
            const emojiA = resolveTeamEmoji(m.emojiAId, m.kodeTimA, m.teamAName);
            const emojiB = resolveTeamEmoji(m.emojiBId, m.kodeTimB, m.teamBName);
            return `${emojiA}**${m.teamAName}** VS ${emojiB}**${m.teamBName}**`;
          })
          .join('\n\u200B\n')
      : '-';

  // Padding awal agar konten jadwal tidak menempel ke sub-judul field
  const matchScheduleValue = `\u200B\n${matchScheduleContent}`;

  // Regulasi swap mengadopsi format bullet point rapi seperti pada opening embed
  const regulationValue =
    `\u200B\n` +
    `• **Kuota Harian:** Maksimal **${TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF} match per hari**.\n` +
    `• **Persetujuan Bersama:** Wajib disepakati oleh seluruh perwakilan tim dari kedua match yang bersangkutan.\n` +
    `• **Diskusi Langsung:** Silakan langsung tag role tim yang ingin diajak bertukar jadwal di room ini.\n` +
    `• **Pengesahan:** Konfirmasi jadwal baru di room match masing-masing agar admin/wasit memperbarui sistem.`;

  const embed = {
    title: `🤝 Room Koordinasi Playoff — ${stageTitle}`,
    description:
      `Room ini dibuka khusus sebagai sarana komunikasi antartim babak Playoff untuk koordinasi internal maupun kesepakatan tukar jadwal pertandingan (**swap schedule**).`,
    fields: [
      // 1. Spacer atas agar tidak menempel ke deskripsi pengantar
      { name: '\u200B', value: '\u200B', inline: false },

      // 2. Blok Jadwal Pertandingan
      {
        name: '📋 Jadwal Pertandingan Pekan Ini',
        value: matchScheduleValue,
        inline: false,
      },

      // 3. Spacer pemisah antara jadwal dan regulasi
      { name: '\u200B', value: '\u200B', inline: false },

      // 4. Blok Regulasi Swap
      {
        name: '📌 Regulasi Swap / Reschedule Playoff',
        value: regulationValue,
        inline: false,
      },
    ],
    color: 0xf59e0b,
    footer: { text: getEmbedFooterText() },
  };

  return {
    content: DISCORD_CONFIG.ROLE_DUELIST ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>` : undefined,
    embeds: [embed],
  };
}