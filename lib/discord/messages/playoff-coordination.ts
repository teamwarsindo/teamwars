import { TOURNAMENT_RULES } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export interface PlayoffCoordinationMessageParams {
  stageTitle: string;
  teams: {
    name: string;
    kodeTim?: string;
    emojiId?: string;
    teamEmoji?: string;
  }[];
}

function resolveTeamEmoji(team: { name: string; kodeTim?: string; emojiId?: string; teamEmoji?: string }): string {
  // 1. Prioritas string emoji utuh jika sudah ada (misal: Unicode 👑 atau custom string)
  if (team.teamEmoji && team.teamEmoji.trim()) {
    return `${team.teamEmoji.trim()} `;
  }

  // 2. Format custom emoji Discord via Snowflake ID (seperti di opening.ts)
  if (team.emojiId && /^\d{17,20}$/.test(team.emojiId.trim())) {
    const rawTag = (team.kodeTim || team.name || 'team')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 32);

    const safeTag = rawTag.length >= 2 ? rawTag : `${rawTag || 't'}_`;
    return `<:${safeTag}:${team.emojiId.trim()}> `;
  }

  return '⚔️ ';
}

export function getPlayoffCoordinationMessagePayload({
  stageTitle,
  teams,
}: PlayoffCoordinationMessageParams) {
  const teamListText =
    teams.length > 0
      ? teams
          .map((t) => {
            const emojiPrefix = resolveTeamEmoji(t);
            return `• ${emojiPrefix}**${t.name}**`;
          })
          .join('\n')
      : '-';

  const embed = {
    title: `🤝 Room Koordinasi Playoff — ${stageTitle}`,
    description:
      `Room ini dibuka khusus sebagai sarana komunikasi antartim babak Playoff untuk koordinasi internal maupun kesepakatan tukar jadwal pertandingan (**swap schedule**).\n\n` +
      `📋 **Tim yang Berlaga di Pekan Ini:**\n${teamListText}\n\n` +
      `📌 **Regulasi Swap / Reschedule Playoff:**\n` +
      `1. **Kuota Harian:** Maksimal **${TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF} match per hari**.\n` +
      `2. **Persetujuan Bersama:** Wajib disepakati oleh seluruh perwakilan tim dari kedua match yang bersangkutan.\n` +
      `3. **Diskusi Langsung:** Silakan langsung tag role tim yang ingin diajak bertukar jadwal di room ini.\n` +
      `4. **Pengesahan:** Setelah mencapai kata sepakat, silakan konfirmasi jadwal baru di room match masing-masing agar admin/wasit memperbarui sistem.`,
    color: 0xf59e0b,
    footer: { text: `Team Wars Indonesia • Playoff ${stageTitle}` },
    timestamp: new Date().toISOString(),
  };

  return {
    content: DISCORD_CONFIG.ROLE_DUELIST ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>` : undefined,
    embeds: [embed],
  };
}
