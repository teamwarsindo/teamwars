import { discordAPI, getFooterText, getWIBTime, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function sendRegistrationMessages(params: any) {
  const { namaTim, warna, ketua, wakil, players, totalRoster, teamSlug, logoTim, buktiTransfer, createdAt, updatedAt } = params;
  
  let dLogo = logoTim.includes('/upload/logo/') ? `https://teamwars.web.id/logo/${logoTim.split('/upload/logo/')[1]}/download` : logoTim;
  const embedColor = hexToDecimal(warna, 3447003);
  const plList = players.map((p: any) => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

  const MESSAGES = [
    {
      channelId: DISCORD_CONFIG.CH_ROSTER,
      payload: { embeds: [{ title: `${namaTim}`, color: embedColor, thumbnail: { url: logoTim }, fields: [{ name: "Ketua", value: ketua.ign, inline: true }, { name: "Wakil", value: wakil.ign, inline: true }, { name: "Players", value: plList, inline: false }], footer: { text: getFooterText(createdAt, updatedAt) } }] }
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
