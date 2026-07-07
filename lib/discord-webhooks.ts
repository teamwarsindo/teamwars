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
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, kvKey, logoTim, buktiTransfer } = params;
  
  const properTeamName = toProperCase(namaTim);
  const namaFileLogo = logoTim.split('/').pop() || 'default.png';
  const namaFileBukti = buktiTransfer.split('/').pop() || 'default.jpg';
  const maskedLogoUrl = `https://teamwars.web.id/logo/${namaFileLogo}`;
  const maskedBuktiUrl = `https://teamwars.web.id/bukti/${namaFileBukti}`;

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
        // Tag admin untuk testing. ID asli Finance: <@&836952890991968266>
        content: "<@&1144271761488216134> 💰 Setoran Masuk!", 
        embeds: [{
          title: `Bukti Transfer: ${properTeamName}`,
          color: embedColor,
          thumbnail: { url: buktiTransfer },
          fields: [
            { name: "Waktu Submit", value: `${getWIBTime()} WIB`, inline: true },
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
        avatar_url: webhookAvatar,
        // Tag admin untuk testing. ID asli Creative: <@&1171096454685794324>
        content: "<@&1144271761488216134> 🎨 Aset Tim Baru!", 
        embeds: [{
          title: `Aset Visual: ${properTeamName}`,
          color: embedColor,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true },
            { name: "Link Logo Asli", value: `[Download Logo Mentah](${maskedLogoUrl})`, inline: false }
          ]
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
