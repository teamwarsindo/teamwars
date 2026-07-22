import { DISCORD_CONFIG, discordAPI, getFooterText, getWIBTime, hexToDecimal } from '@/lib/discord';

interface RegistrationParams {
  namaTim: string;
  warna: string;
  ketua: any;
  wakil: any;
  players: any[];
  totalRoster: number;
  teamSlug: string;
  logoTim: string;
  buktiTransfer: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function sendAllRegistrationMessages(params: RegistrationParams) {
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, logoTim, buktiTransfer, createdAt, updatedAt } = params;

  // 1. MASKING URL SUDAH INCLUDE DI SINI ✅
  let directDownloadLogo = logoTim.includes('/upload/logo/') 
    ? `https://teamwars.web.id/logo/${logoTim.split('/upload/logo/')[1]}/download` 
    : logoTim;
  
  const embedColor = hexToDecimal(warna, 3447003);
  const playerListString = players.map(p => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

  // 2. PENYUSUNAN PAYLOAD
  const payloadRoster = {
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
  };

  const payloadFinance = {
    content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${namaTim}**!`,
    embeds: [{
      title: `Detail Pembayaran: ${namaTim}`,
      color: embedColor,
      description: `**[✅ KLIK DISINI UNTUK KONFIRMASI](${process.env.NEXT_PUBLIC_BASE_URL || 'https://teamwars.web.id'}/api/approve?team=${teamSlug})**`,
      image: { url: buktiTransfer },
      fields: [{ name: "Waktu Submit", value: `${getWIBTime()} WIB`, inline: true }]
    }]
  };

  const payloadCreative = {
    content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim: **${namaTim}**`,
    embeds: [{
      title: `Aset Visual: ${namaTim}`,
      color: embedColor,
      description: `**[⬇️ DOWNLOAD LOGO](${directDownloadLogo})**`,
      image: { url: logoTim },
      fields: [{ name: "Kode Warna", value: `\`${warna}\``, inline: true }]
    }]
  };

  const payloadLog = {
    embeds: [{
      title: `🔥 Tim Baru Mendaftar: ${namaTim}`,
      color: hexToDecimal('#58B95A', 5814786), 
      description: `Tim **${namaTim}** telah sukses submit pendaftaran membawa **${totalRoster}** pemain!`,
      timestamp: new Date().toISOString()
    }]
  };

  // ==========================================
  // 3. TARGET CHANNEL TESTING (Semua Diarahkan ke Sini)
  // ==========================================
  // 👇 Ubah ini dengan ID Channel Admin/Testing milikmu (Misal pakai CH_LOG / CH_REFEREE)
  const TARGET_TESTING_CHANNEL = DISCORD_CONFIG.CH_LOG; 

  const [rosterRes, financeRes, creativeRes, logRes] = await Promise.allSettled([
    discordAPI(`/channels/${TARGET_TESTING_CHANNEL}/messages`, 'POST', payloadRoster),
    discordAPI(`/channels/${TARGET_TESTING_CHANNEL}/messages`, 'POST', payloadFinance),
    discordAPI(`/channels/${TARGET_TESTING_CHANNEL}/messages`, 'POST', payloadCreative),
    discordAPI(`/channels/${TARGET_TESTING_CHANNEL}/messages`, 'POST', payloadLog)
  ]);

  // 4. KEMBALIKAN SEMUA MESSAGE ID
  return {
    rosterMsgId: rosterRes.status === 'fulfilled' ? rosterRes.value?.id || "" : "",
    financeMsgId: financeRes.status === 'fulfilled' ? financeRes.value?.id || "" : "",
    creativeMsgId: creativeRes.status === 'fulfilled' ? creativeRes.value?.id || "" : "",
    logMsgId: logRes.status === 'fulfilled' ? logRes.value?.id || "" : ""
  };
}
