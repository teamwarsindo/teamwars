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
        title: "⏳ Pendaftaran Segera Ditutup!",
        color: hexDecimal,
        description: `Periksa kembali data roster tim **${params.namaTim}** sebelum waktu pendaftaran berakhir.`,
        fields: [
          {
            name: "⏱️ Sisa Waktu",
            value: `\`\`\`${params.sisaWaktuText}\`\`\``,
            inline: false,
          },
          {
            name: "🔍 Hal yang Wajib Dicek",
            value: "• Typo pada **IGN** & **Duel ID**.\n• Status verifikasi Discord pemain.\n• Tambah / kurangi anggota roster (Maks 10).",
            inline: false,
          },
          {
            name: "📝 Cara Edit Data Tim",
            value: `Klik tombol **Edit Team** di bawah atau gunakan tautan yang dikirim ke email registered:\n📧 \`${maskEmail(params.email)}\`\n\n*Gagal/Email tidak ketemu? Hubungi Admin Discord.*`,
            inline: false,
          },
        ],
        footer: {
          text: getFormattedFooterTime(),
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
  
