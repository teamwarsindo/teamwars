export const DISCORD_CONFIG = {
  // 🛡️ ROLES
  BOT_ROLE_ID: '1521016621597065309', 
  ROLE_VERIFIED: '1166693043756343397',
  ROLE_DUELIST: '1525761725901570158',
  ROLE_KETUA: '610109155465756692',
  ROLE_WAKIL: '1173455029814952006',
  ROLE_ADMIN: '1144271761488216134',
  ROLE_REFEREE: '604079443647922197',
  ROLE_FINANCE: '836952890991968266',    // Baru dipindah dari registration.ts
  ROLE_CREATIVE: '1171096454685794324',     // Baru dipindah dari registration.ts

  // 📂 KATEGORI
  CT_TEAM_ID: '1521074286574567504',
  CT_MATCH_ID: '1527913792976064554', 

  // 💬 CHANNELS
  CH_BUKTI: '1170909631049121872',
  CH_LOGO: '1170909631049121872',
  CH_ROSTER: '1170909631049121872',

  // Channel khusus testing/wasit
  CH_REFEREE: '610153245955850240',

  // Pusat CCTV (Tim Daftar & Klaim Role)
  CH_LOG: '1525775643168735344',
};

import { discordAPI, getFooterText, getWIBTime, hexToDecimal } from '../utils';

export async function sendRegistrationMessages(params: any) {
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, logoTim, buktiTransfer, createdAt, updatedAt } = params;
  
  let dLogo = logoTim.includes('/upload/logo/') ? `https://teamwars.web.id/logo/${logoTim.split('/upload/logo/')[1]}/download` : logoTim;
  const embedColor = hexToDecimal(warna, 3447003);
  const plList = players.map((p: any) => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

  const MESSAGES = [
    {
      channelId: DISCORD_CONFIG.CH_ROSTER,
      payload: { embeds: [{ title: `[ROSTER DB] ${namaTim}`, color: embedColor, thumbnail: { url: logoTim }, fields: [{ name: "Ketua", value: ketua.ign, inline: true }, { name: "Wakil", value: wakil.ign, inline: true }, { name: "Players", value: plList, inline: false }], footer: { text: getFooterText(createdAt, updatedAt) } }] }
    },
    {
      // 👇 Diubah dari CH_FINANCE menjadi CH_BUKTI
      channelId: DISCORD_CONFIG.CH_BUKTI,
      payload: { 
        content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${namaTim}**!`, 
        embeds: [{ title: `Detail Pembayaran: ${namaTim}`, color: embedColor, description: `**[✅ KLIK DISINI UNTUK KONFIRMASI](https://teamwars.web.id/api/approve?team=${teamSlug})**`, image: { url: buktiTransfer }, fields: [{ name: "Waktu", value: `${getWIBTime()} WIB`, inline: true }] }] 
      }
    },
    {
      // 👇 Diubah dari CH_ASSETS menjadi CH_LOGO
      channelId: DISCORD_CONFIG.CH_LOGO,
      payload: { 
        // 👇 Diubah dari ROLE_ASSETS menjadi ROLE_CREATIVE
        content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim: **${namaTim}**`, 
        embeds: [{ title: `Aset Visual: ${namaTim}`, color: embedColor, description: `**[⬇️ DOWNLOAD LOGO](${dLogo})**\nKode Warna: \`${warna}\``, image: { url: logoTim } }] 
      }
    },
    {
      channelId: DISCORD_CONFIG.CH_LOG,
      payload: { embeds: [{ title: `🔥 Tim Baru Mendaftar: ${namaTim}`, color: hexToDecimal('#58B95A', 5814786), description: `Tim **${namaTim}** telah sukses submit pendaftaran membawa **${totalRoster}** pemain!`, timestamp: new Date().toISOString() }] }
    }
  ];

  for (const msg of MESSAGES) {
    if (msg.channelId) {
      await discordAPI(`/channels/${msg.channelId}/messages`, 'POST', msg.payload);
      // Rate limit safety
      await new Promise(res => setTimeout(res, 300));
    }
  }
      }
