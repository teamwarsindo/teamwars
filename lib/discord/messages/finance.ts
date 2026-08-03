import { discordAPI, hexToDecimal, getWIBTime } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function sendFinanceMessage(params: {
  namaTim: string;
  warna: string;
  buktiTransfer: string;
  teamSlug: string;
  channelId?: string;  // Parameter opsional
  categoryId?: string; // Parameter opsional
}) {
  const { namaTim, warna, buktiTransfer, teamSlug, channelId } = params;
  
  const payload = {
    content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${namaTim}**!`, 
    embeds: [{
      title: `Detail Registrasi: ${namaTim}`,
      color: hexToDecimal(warna),
      description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${teamSlug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
      image: { url: buktiTransfer },
      fields: [
        { name: "Waktu Submit", value: `${getWIBTime()} WIB`, inline: true },
        { name: "Status", value: "🟡 Menunggu Konfirmasi", inline: true }
      ],
    }]
  };

  // Gunakan channelId dari input, jika kosong fallback ke config
  const targetChannel = channelId || DISCORD_CONFIG.CH_BUKTI;

  try {
    const res = await discordAPI(`/channels/${targetChannel}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error(`Gagal kirim Finance msg untuk ${namaTim}:`, error);
    return null;
  }
}
