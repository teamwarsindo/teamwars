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
  const matchScheduleText =
    matches.length > 0
      ? matches
          .map((m) => {
            const emojiA = resolveTeamEmoji(m.emojiAId, m.kodeTimA, m.teamAName);
            const emojiB = resolveTeamEmoji(m.emojiBId, m.kodeTimB, m.teamBName);
            return `• ${emojiA}**${m.teamAName}** vs ${emojiB}**${m.teamBName}**`;
          })
          .join('\n\n')
      : '-';

  const embed = {
    title: `🤝 Room Koordinasi Playoff — ${stageTitle}`,
    description:
      `Room ini dibuka khusus sebagai sarana komunikasi antartim babak Playoff untuk koordinasi internal maupun kesepakatan tukar jadwal pertandingan (**swap schedule**).\n\n` +
      `📌 **Regulasi Swap / Reschedule Playoff:**\n` +
      `1. **Kuota Harian:** Maksimal **${TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF} match per hari**.\n` +
      `2. **Persetujuan Bersama:** Wajib disepakati oleh seluruh perwakilan tim dari kedua match yang bersangkutan.\n` +
      `3. **Diskusi Langsung:** Silakan langsung tag role tim yang ingin diajak bertukar jadwal di room ini.\n` +
      `4. **Pengesahan:** Setelah mencapai kata sepakat, silakan konfirmasi jadwal baru di room match masing-masing agar admin/wasit memperbarui sistem.`,
    fields: [
      {
        name: '📋 Jadwal Pertandingan Pekan Ini',
        value: matchScheduleText,
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