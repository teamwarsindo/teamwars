import { TESTER_MATCH_DATA } from '@/lib/config-tester';

export function buildPrepareEmbed() {
  const { teamA, teamB, wasit, roomId } = TESTER_MATCH_DATA;
  return {
    content: `📢 **Kapten <@&${teamA.roleId}> (${teamA.nama}) & <@&${teamB.roleId}> (${teamB.nama})!**`,
    embeds: [
      {
        title: '⚔️ MATCH BRIEFING & ROOM MATCH',
        description: `Match dipimpin oleh Wasit ${wasit.mention}. Waktu tanding telah tiba!`,
        color: 3066993, // Hijau / Ready
        fields: [
          {
            name: '🎮 Room Match',
            value: `**ID Room:** \`${roomId}\`\n*(Privat! Hanya pemain tanding yang boleh masuk)*`,
            inline: false,
          },
          {
            name: '⏱️ Waktu Kontrol',
            value: `\`15 Menit / Match\` (Jalan saat ganti deck, pause saat di dalam game/lobby).`,
            inline: true,
          },
          {
            name: '📸 SS Starting Hand',
            value: `Wajib SS tiap game. Akumulasi 2x Peringatan SS = \`Loss 1 Deck\`.`,
            inline: true,
          },
          {
            name: '⚠️ DC & Glitch',
            value: `Disconnect = Kalah Otomatis game tersebut.`,
            inline: false,
          },
          {
            name: '📢 INSTRUKSI KAPTEN',
            value: `> Silakan konfirmasi kesiapan dan sebutkan **STARTER** yang turun di channel tim masing-masing!`,
            inline: false,
          },
        ],
        footer: { text: 'Team Wars Indonesia • Season 7' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
