export function buildReminderEmbed(
  teamName: string,
  roleId: string,
  matchTime: string,
  wasitMention: string
) {
  return {
    content: `<@&${roleId}>`, // Mention Role
    embeds: [
      {
        title: '⏳ REMINDER MATCH — TWI SEASON 7',
        description: `Halo **${teamName}**, pertandingan kalian akan dimulai malam ini!`,
        color: 15844367, // Warna Emas / Warning
        fields: [
          {
            name: '⏰ Jadwal Krusial',
            value: `• **Kick-off:** \`${matchTime}\`\n• **Batas Pengumpulan Deck:** 60 Menit sebelum Kick-off`,
            inline: false,
          },
          {
            name: '⚠️ Aturan Deck (10 Deck)',
            value: `• Kirim SS terbaru & jelas di channel ini.\n• **Telat:** Potong waktu kontrol 2 menit/deck.\n• **Slot Kosong saat Kick-off:** Auto-Loss.`,
            inline: false,
          },
          {
            name: '🚨 Sanksi Fatal',
            value: `• **Salah ID/IGN & Ubah Deck:** \`Loss 2 Deck/Game\`\n• **Archetype > 5x / Salah Archetype:** \`Loss 1 Deck/Game\``,
            inline: false,
          },
          {
            name: '❓ Butuh Bantuan & Regulasi',
            value: `Tanya Wasit: ${wasitMention}\n[Baca Rules Lengkap](https://teamwars.web.id/rules)`,
            inline: false,
          },
        ],
        footer: { text: 'Team Wars Indonesia • Season 7' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
