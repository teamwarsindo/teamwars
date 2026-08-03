import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function sendCreativeMessage(params: {
  namaTim: string;
  warna: string;
  logoTim: string;
  channelId?: string;
  categoryId?: string;
}) {
  const { namaTim, warna, logoTim, channelId } = params;

  // Handle URL Cloudinary jika ada
  let directDownloadLogo = logoTim;
  if (logoTim.includes('/upload/logo/')) {
    const splitUrl = logoTim.split('/upload/logo/');
    if (splitUrl.length > 1) {
      // 1. Ambil path filenya
      let filePath = splitUrl[1]; 
      
      // 2. Buang query string (?t=123...) jika ada
      if (filePath.includes('?')) {
        filePath = filePath.split('?')[0];
      }

      // 3. Gabungkan menjadi link download yang bersih
      directDownloadLogo = `https://teamwars.web.id/logo/${filePath}/download`;
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

  const targetChannel = channelId || DISCORD_CONFIG.CH_LOGO;

  try {
    const res = await discordAPI(`/channels/${targetChannel}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error(`Gagal kirim Creative msg untuk ${namaTim}:`, error);
    return null;
  }
}
