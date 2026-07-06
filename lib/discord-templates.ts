// lib/discord-templates.ts

export const getDiscordWebhooks = (data: any, kvKey: string, maskedBuktiUrl: string, maskedLogoUrl: string) => {
  const embedColor = parseInt(data.warna.replace('#', ''), 16) || 3447003;
  
  return [
    {
      name: "Admin",
      url: process.env.DISCORD_WEBHOOK_ADMIN,
      payload: {
        username: "Registration TWI Season 7",
        embeds: [{
          title: `🚀 PENDAFTARAN BARU: ${data.namaTim.toUpperCase()}`,
          color: embedColor,
          fields: [
            { name: "👑 Ketua Tim", value: data.ketua.namaLengkap, inline: true },
            { name: "👥 Total Roster", value: `${data.players.length} Pemain`, inline: true },
            { name: "🔑 Redis Key", value: `\`${kvKey}\``, inline: false },
          ]
        }]
      }
    },
    {
      name: "Finance",
      url: process.env.DISCORD_WEBHOOK_FINANCE,
      payload: {
        username: "Registration TWI Season 7",
        content: "<@&836952890991968266> 💰 Setoran Masuk!",
        embeds: [{
          title: `Bukti Transfer: ${data.namaTim.toUpperCase()}`,
          color: embedColor,
          fields: [
            { name: "Waktu Submit", value: new Date().toLocaleString('id-ID'), inline: true },
            { name: "Link Bukti TF", value: `[Klik untuk lihat Bukti Transfer](${maskedBuktiUrl})`, inline: false }
          ]
        }]
      }
    },
    {
        name: "Creative",
        url: process.env.DISCORD_WEBHOOK_CREATIVE,
        payload: {
          username: "Registration TWI Season 7",
          avatar_url: "https://link-ke-logo-twi.png",
          content: "<@&1171096454685794324> 🎨 Aset Tim Baru!",
          embeds: [{
            title: `Aset Visual: ${namaTim.toUpperCase()}`,
            color: embedColor,
            fields: [
              { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true },
              { name: "Link Logo Asli (Masked)", value: `[Download Logo Mentah](${maskedLogoUrl})`, inline: false }
            ]
          }]
        }
      },
      {
        name: "Public",
        url: process.env.DISCORD_WEBHOOK_PUBLIC,
        payload: {
          username: "Registration TWI Season 7",
          avatar_url: "https://link-ke-logo-twi.png",
          content: `🔥 Tim **${namaTim.toUpperCase()}** telah resmi mendaftar ke TWI Season 7 membawa **${players.length}** pemain elit!`
        }
      }
  ];
};
