import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function sendCreativeMessage(params: {
  namaTim: string;
  warna: string;
  logoTim: string;
  channelId?: string;  // Parameter opsional
  categoryId?: string; // Parameter opsional
}) {
  const { namaTim, warna, logoTim, channelId } = params;

  // Handle URL Cloudinary jika ada
  let directDownloadLogo = logoTim;
  if (logoTim.includes('/upload/logo/')) {
    const splitUrl = logoTim.split('/upload/logo/');
    if (splitUrl.length > 1) {
      directDownloadLogo = `https://teamwars.web.id/logo/${splitUrl[1]}/download`;
    }
  }

  const payload = {
    content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim Baru: **${namaTim}**!`, 
    embeds: [{
      title: `Aset Visual: ${namaTim}`,
      color: hexToDecimal(warna),
      description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
      image: { url: logoTim },
      fields: [
        { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
      ]
    }]
  };

  // Gunakan channelId dari input, jika kosong fallback ke config
  const targetChannel = channelId || DISCORD_CONFIG.CH_LOGO;

  try {
    const res = await discordAPI(`/channels/${targetChannel}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error(`Gagal kirim Creative msg untuk ${namaTim}:`, error);
    return null;
  }
}
