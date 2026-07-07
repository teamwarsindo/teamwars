// Helper untuk Proper Case
function toProperCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

// Helper untuk waktu WIB
function getWIBTime() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "medium"
  });
}

// Helper untuk Footer bergaya ProBot ("Diperbarui 2 Agustus 2024")
function getFooterDate() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export async function sendAllWebhooks(params: { 
  namaTim: string; 
  warna: string; 
  ketua: any; 
  wakil: any;
  players: any[];
  totalRoster: number; 
  teamSlug: string; 
  kvKey: string; 
  logoTim: string; 
  buktiTransfer: string; 
}) {
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, logoTim, buktiTransfer } = params;
  
  const properTeamName = toProperCase(namaTim);
  
  // MASKING URL (Tetap aman sesuai request)
  const namaFileLogo = logoTim.split('/').pop() || 'default.png';
  const namaFileBukti = buktiTransfer.split('/').pop() || 'default.jpg';
  const maskedLogoUrl = `https://teamwars.web.id/logo/${namaFileLogo}`;
  const maskedBuktiUrl = `https://teamwars.web.id/bukti/${namaFileBukti}`;

  // Trik Cloudinary: Memaksa browser download file saat diklik (fl_attachment)
  const directDownloadLogo = logoTim.includes('/upload/') 
    ? logoTim.replace('/upload/', '/upload/fl_attachment/') 
    : logoTim;

  const embedColor = parseInt(warna.replace('#', ''), 16) || 3447003;
  const webhookAvatar = "https://teamwars.web.id/logo-dc.png";

  // Format Array Players menjadi list ke bawah ala ProBot: "IGN (Duel ID)"
  const playerListString = players.map(p => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

  const WEBHOOKS = [
    {
      name: "Admin",
      url: process.env.DISCORD_WEBHOOK_ADMIN,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        embeds: [{
          title: properTeamName,
          color: embedColor,
          // Thumbnail dibiarkan untuk admin biar ringkas
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketua.ign, inline: true },
            { name: "Wakil", value: wakil.ign, inline: true },
            { name: "Players", value: playerListString, inline: false }
          ],
          footer: { text: `Tercatat di sistem pada ${getFooterDate()}` }
        }]
      }
    },
    {
      name: "Finance",
      url: process.env.DISCORD_WEBHOOK_FINANCE,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        // Gambar ditaruh di luar embed agar preview Discord jebol/muncul besar
        content: `<@&1144271761488216134> 💰 Setoran Masuk dari **${properTeamName}**!\n\n**Preview Bukti Transfer:**\n${maskedBuktiUrl}`, 
        embeds: [{
          title: `Detail Registrasi: ${properTeamName}`,
          color: embedColor,
          fields: [
            { name: "Waktu Submit", value: `${getWIBTime()} WIB`, inline: true },
            { name: "Status", value: "🟡 Menunggu Konfirmasi", inline: true }
          ]
        }],
        // Tombol Konfirmasi (Tembus ke API lu)
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 5,
            label: "✅ Konfirmasi Pembayaran",
            url: `https://teamwars.web.id/api/approve?team=${teamSlug}`
          }]
        }]
      }
    },
    {
      name: "Creative",
      url: process.env.DISCORD_WEBHOOK_CREATIVE,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        // Gambar ditaruh di luar embed agar preview Discord jebol/muncul besar
        content: `<@&1144271761488216134> 🎨 Aset Tim Baru: **${properTeamName}**!\n\n**Preview Logo:**\n${maskedLogoUrl}`, 
        embeds: [{
          title: `Aset Visual: ${properTeamName}`,
          color: embedColor,
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }],
        // Tombol Direct Download Cloudinary
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 5,
            label: "⬇️ Download Logo Mentah",
            url: directDownloadLogo
          }]
        }]
      }
    },
    {
      name: "Public",
      url: process.env.DISCORD_WEBHOOK_PUBLIC,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `🔥 Tim **${properTeamName}** telah resmi mendaftar ke TWI Season 7 membawa **${totalRoster}** pemain elit!`
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
        await sleep(300); // Jeda anti rate-limit Discord
      } catch (err) {
        console.error(`Gagal kirim webhook ${hook.name}:`, err);
      }
    }
  }
}
