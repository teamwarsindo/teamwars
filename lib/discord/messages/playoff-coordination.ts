import { TOURNAMENT_RULES } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export interface PlayoffCoordinationMessageParams {
  stageTitle: string;
  teams: { name: string; roleId?: string }[];
}

export function getPlayoffCoordinationMessagePayload({
  stageTitle,
  teams,
}: PlayoffCoordinationMessageParams) {
  const teamListText =
    teams.length > 0
      ? teams
          .map((t) => (t.roleId ? `• <@&${t.roleId}> (**${t.name}**)` : `• **${t.name}**`))
          .join('\n')
      : '-';

  const mentionContent = teams
    .filter((t) => !!t.roleId)
    .map((t) => `<@&${t.roleId}>`)
    .join(' ');

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
    content: mentionContent || (DISCORD_CONFIG.ROLE_DUELIST ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>` : undefined),
    embeds: [embed],
  };
}
