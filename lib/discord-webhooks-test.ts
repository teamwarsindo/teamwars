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

  const waktuBuat = createdAt ? formatTanggal(createdAt) : formatTanggal(new Date());
  let footerText = `Tercatat di sistem pada ${waktuBuat}`;
  
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
  createdAt?: string; 
  updatedAt?: string; 
}) {
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, logoTim, buktiTransfer, createdAt, updatedAt } = params;
  
  let directDownloadLogo = logoTim;

  // Aman: Jika bukan link Cloudinary, blok kode ini akan dilewati otomatis
  if (logoTim.includes('/upload/logo/')) {
    const splitUrl = logoTim.split('/upload/logo/');
    if (splitUrl.length > 1) {
      const imagePath = splitUrl[1]; 
      directDownloadLogo = `https://teamwars.web.id/logo/${imagePath}/download`;
    }
  }

  let parsedColor = parseInt(warna.replace('#', ''), 16);
  if (isNaN(parsedColor)) parsedColor = 3447003; 
  const embedColor = parsedColor === 0 ? 1 : parsedColor; 
  
  const webhookAvatar = "https://teamwars.web.id/logo-dc.png";
  const playerListString = players.map(p => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

  // URL & Tag seragam untuk testing
  const TESTING_WEBHOOK_URL = "https://discord.com/api/webhooks/1527694407934017536/wOwLUwtpKiJqAC_l5XPawF8uNdpGCD8Ix6wbei5x6ivsTb8k0gjWn-AyhUAF73RCBkhu";
  const ADMIN_TAG = "<@&1144271761488216134>";

  const WEBHOOKS = [
    {
      name: "Admin",
      url: TESTING_WEBHOOK_URL,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `${ADMIN_TAG} 🛡️ Data pendaftaran baru dari **${namaTim}** telah masuk!`,
        embeds: [{
          title: namaTim,
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
      url: TESTING_WEBHOOK_URL,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `${ADMIN_TAG} 💰 Setoran Masuk dari **${namaTim}**!`, 
        embeds: [{
          title: `Detail Registrasi: ${namaTim}`,
          color: embedColor,
          description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${teamSlug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
          image: { url: buktiTransfer },
          fields: [
            { name: "Waktu Submit", value: `${getWIBTime()} WIB`, inline: true },
            { name: "Status", value: "🟡 Menunggu Konfirmasi", inline: true }
          ],
        }]
      }
    },
    {
      name: "Creative",
      url: TESTING_WEBHOOK_URL,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `${ADMIN_TAG} 🎨 Aset Tim Baru: **${namaTim}**!`, 
        embeds: [{
          title: `Aset Visual: ${namaTim}`,
          color: embedColor,
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
          image: { url: logoTim },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }]
      }
    },
    {
      name: "Public",
      url: TESTING_WEBHOOK_URL,
      payload: {
        username: "Registration TWI Season 7",
        avatar_url: webhookAvatar,
        content: `🔥 Tim **${namaTim}** telah resmi mendaftar ke TWI Season 7 membawa **${totalRoster}** pemain elit!`
      }
    }
  ];

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let recordedMessageIds: Record<string, string> = {}; 

  for (const hook of WEBHOOKS) {
    if (hook.url) {
      try {
        const urlWithWait = `${hook.url}?wait=true`;

        const res = await fetch(urlWithWait, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hook.payload)
        });

        if (res.ok) {
          const data = await res.json();
          recordedMessageIds[hook.name] = data.id; 
        }
        
        await sleep(300);
      } catch (err) {
        console.error(`Gagal kirim webhook ${hook.name}:`, err);
      }
    }
  }

  return recordedMessageIds; 
    }
        
