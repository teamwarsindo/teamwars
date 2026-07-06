export async function sendAllWebhooks(params: { namaTim: string, warna: string, ketua: any, totalRoster: number, teamSlug: string, kvKey: string, logoTim: string, buktiTransfer: string }) {
  const { namaTim, warna, ketua, totalRoster, teamSlug, kvKey, logoTim, buktiTransfer } = params;
  
  // Ambil nama file + ekstensi asli secara dinamis (Anti salah format .png/.jpg)
  const namaFileLogo = getFilenameOnly(logoTim); 
  const namaFileBukti = getFilenameOnly(buktiTransfer);

  // Gabungkan langsung ke domain masking web lu tanpa angka versi!
  const maskedLogoUrl = `https://teamwars.web.id/logo/${namaFileLogo}`;
  const maskedBuktiUrl = `https://teamwars.web.id/bukti/${namaFileBukti}`;

  const embedColor = parseInt(warna.replace('#', ''), 16) || 3447003;
  
  const WEBHOOKS = [
    {
      name: "Admin",
      url: process.env.DISCORD_WEBHOOK_ADMIN,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: "https://link-ke-logo-twi.png",
        embeds: [{
          title: `🚀 PENDAFTARAN BARU: ${namaTim.toUpperCase()}`,
          color: embedColor,
          fields: [
            { name: "👑 Ketua Tim", value: ketua.namaLengkap, inline: true },
            { name: "👥 Total Roster", value: `${totalRoster} Pemain`, inline: true },
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
        avatar_url: "https://link-ke-logo-twi.png",
        content: "<@&836952890991968266> 💰 Setoran Masuk!",
        embeds: [{
          title: `Bukti Transfer: ${namaTim.toUpperCase()}`,
          color: embedColor,
          fields: [
            { name: "Waktu Submit", value: new Date().toLocaleString('id-ID'), inline: true },
            { name: "Link Bukti TF (Masked)", value: `[Klik untuk lihat Bukti Transfer](${maskedBuktiUrl})`, inline: false }
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
        content: `🔥 Tim **${namaTim.toUpperCase()}** telah resmi mendaftar ke TWI Season 7 membawa **${totalRoster}** pemain elit!`
      }
    }
  ];

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (const hook of WEBHOOKS) {
    if (hook.url) {
      try {
        await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hook.payload)
        });
        await sleep(300); // Jeda anti rate-limit
      } catch (err) {
        console.error(`Gagal kirim webhook ${hook.name}:`, err);
      }
    }
  }
}
