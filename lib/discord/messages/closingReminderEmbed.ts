function getFormattedFooterTime() {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).replace('.', ':');

  return `${dateStr} at ${timeStr} WIB`;
}

function maskEmail(email: string) {
  if (!email) return '••••@••••.com';
  const [name, domain] = email.split('@');
  if (!domain) return '••••@••••.com';
  const maskedName = name.length > 2 ? name.slice(0, 2) + '••••' : name[0] + '••••';
  return `${maskedName}@${domain}`;
}

export function createClosingReminderEmbed(params: {
  roleMentionId: string;
  namaTim: string;
  email: string;
  sisaWaktuText: string;
  hexWarna: string;
}) {
  const hexDecimal = parseInt(params.hexWarna.replace('#', ''), 16) || 15158332;

  return {
    content: `<@&${params.roleMentionId}>`,
    embeds: [
      {
        title: "⌛ Pengingat Batas Akhir Edit Team!",
        color: hexDecimal,
        description: `Pendaftaran baru telah **ditutup**. Segera periksa dan kunci data roster tim **${params.namaTim}** sebelum waktu perbaikan berakhir!`,
        fields: [
          {
            name: "⏱️ Sisa Waktu Edit Data",
            value: `\`\`\`${params.sisaWaktuText}\`\`\``,
            inline: false,
          },
          {
            name: "🔍 Poin Penting Perbaikan Roster",
            value: "• Pastikan tidak ada typo pada **IGN In-Game** & **Duel ID**.\n• Pastikan seluruh anggota tim sudah **Terverifikasi Discord**.\n• Atur susunan pemain utama dan cadangan (Maks. 10 Pemain).",
            inline: false,
          },
          {
            name: "📝 Cara Memperbarui Data Tim",
            value: `Klik tombol **Edit Team** di bawah ini atau buka tautan verifikasi yang dikirim ke email registered:\n📧 \`${maskEmail(params.email)}\`\n\n*Catatan: Setelah waktu habis, data roster akan terkunci secara otomatis dan tidak bisa diubah.*`,
            inline: false,
          },
        ],
        footer: {
          text: `Team Wars Indonesia • ${getFormattedFooterTime()}`,
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            custom_id: "btn_edit_team",
            label: "Edit Team",
            emoji: { name: "✏️" }
          }
        ]
      }
    ]
  };
}
