// Helper untuk Proper Case
function toProperCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

// Helper untuk waktu WIB (Untuk body embed)
function getWIBTime() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "medium"
  });
}

// Helper untuk Footer Dinamis (Tercatat vs Diperbarui)
function getFooterText(createdAt?: string, updatedAt?: string) {
  const formatTanggal = (dateRaw: string | Date) => {
    return new Date(dateRaw).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB";
  };

  // Default ke waktu sekarang jika tidak ada createdAt yang dilempar
  const waktuBuat = createdAt ? formatTanggal(createdAt) : formatTanggal(new Date());
  
  let footerText = `Tercatat di sistem pada ${waktuBuat}`;
  
  // Jika ada parameter updatedAt, tambahkan baris baru
  if (updatedAt) {
    footerText += `\nDiperbarui pada ${formatTanggal(updatedAt)}`;
  }
  
  return footerText;
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
  createdAt?: string; // Tambahan untuk tracking DB
  updatedAt?: string; // Tambahan untuk tracking DB
}) {
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, logoTim, buktiTransfer, createdAt, updatedAt } = params;
  
  const properTeamName = toProperCase(namaTim);
  
  // Masking URL Logo ke format teamwars.web.id/logo/.../download
  let maskedLogoUrl = logoTim;
  if (logoTim.includes('/upload/')) {
    const splitUrl = logoTim.split('/upload/');
    if (splitUrl.length > 1) {
      const imagePath = splitUrl[1]; // Mengambil path file setelah '/upload/'
      maskedLogoUrl = `https://teamwars.web.id/logo/${imagePath}/download`;
    }
  }

  let parsedColor = parseInt(warna.replace('#', ''), 16);
  if (isNaN(parsedColor)) parsedColor = 3447003; 
  const embedColor = parsedColor === 0 ? 1 : parsedColor; // Fix bug warna hitam (#000000)
  
  const webhookAvatar = "https://teamwars.web.id/logo-dc.png";
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
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      }
    },
    {
      name: "Finance",
      url: process.env.DISCORD_WEBHOOK_FINANCE,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `<@&836952890991968266> 💰 Setoran Masuk dari **${properTeamName}**!`, 
        embeds: [{
          title: `Detail Registrasi: ${properTeamName}`,
          color: embedColor,
          description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${teamSlug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
          image: { url: buktiTransfer },
          fields: [
            { name: "Waktu Submit", value: `${getWIBTime()} WIB`, inline: true },
            { name: "Status", value: "🟡 Menunggu Konfirmasi", inline: true }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      }
    },
    {
      name: "Creative",
      url: process.env.DISCORD_WEBHOOK_CREATIVE,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `<@&1171096454685794324> 🎨 Aset Tim Baru: **${properTeamName}**!`, 
        embeds: [{
          title: `Aset Visual: ${properTeamName}`,
          color: embedColor,
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${maskedLogoUrl})**`,
          image: { url: logoTim },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
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
  let recordedMessageIds: Record<string, string> = {}; // 👈 Koper untuk menampung Message ID

  for (const hook of WEBHOOKS) {
    if (hook.url) {
      try {
        // 🚨 KUNCI UTAMA: Tambahkan ?wait=true agar Discord membalas dengan JSON Message ID
        const urlWithWait = `${hook.url}?wait=true`;

        const res = await fetch(urlWithWait, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hook.payload)
        });

        if (res.ok) {
          const data = await res.json();
          recordedMessageIds[hook.name] = data.id; // Simpan ID berdasarkan nama webhook (Admin, Finance, dll)
        }
        
        await sleep(300);
      } catch (err) {
        console.error(`Gagal kirim webhook ${hook.name}:`, err);
      }
    }
  }

  // 👈 Kembalikan ID ini ke route.ts
  return recordedMessageIds; 
}
