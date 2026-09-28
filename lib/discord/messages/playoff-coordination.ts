import { TOURNAMENT_RULES } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';

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
  // Susun format matchup tanpa bullet point '•' dan menggunakan 'VS' kapital
  const matchScheduleContent =
    matches.length > 0
      ? matches
          .map((m) => {
            const emojiA = resolveTeamEmoji(m.emojiAId, m.kodeTimA, m.teamAName);
            const emojiB = resolveTeamEmoji(m.emojiBId, m.kodeTimB, m.teamBName);
            return `${emojiA}**${m.teamAName}** VS ${emojiB}**${m.teamBName}**`;
          })
          .join('\n\n')
      : '-';

  // Karakter zero-width space (\u200B) untuk memberikan padding vertikal alami agar isi tidak mepet ke sub-judul field
  const matchScheduleValue = `\u200B\n${matchScheduleContent}`;

  const embed = {
    title: `🤝 Room Koordinasi Playoff — ${stageTitle}`,
    description:
      `Room ini dibuka khusus sebagai sarana komunikasi antartim babak Playoff untuk koordinasi internal maupun kesepakatan tukar jadwal pertandingan (**swap schedule**).\n\n` +
      `📌 **Regulasi Swap / Reschedule Playoff:**\n\n` +
      `1. **Kuota Harian:** Maksimal **${TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF} match per hari**.\n\n` +
      `2. **Persetujuan Bersama:** Wajib disepakati oleh seluruh perwakilan tim dari kedua match yang bersangkutan.\n\n` +
      `3. **Diskusi Langsung:** Silakan langsung tag role tim yang ingin diajak bertukar jadwal di room ini.\n\n` +
      `4. **Pengesahan:** Setelah mencapai kata sepakat, silakan konfirmasi jadwal baru di room match masing-masing agar admin/wasit memperbarui sistem.`,
    fields: [
      {
        name: '📋 Jadwal Pertandingan Pekan Ini',
        value: matchScheduleValue,
        inline: false,
      },
    ],
    color: 0xf59e0b,
    footer: { text: `Team Wars Indonesia • Playoff ${stageTitle}` },
    timestamp: new Date().toISOString(),
  };

  return {
    content: DISCORD_CONFIG.ROLE_DUELIST ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>` : undefined,
    embeds: [embed],
  };
}