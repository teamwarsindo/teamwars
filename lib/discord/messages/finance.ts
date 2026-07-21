import { discordAPI, hexToDecimal, getWIBTime } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function sendFinanceMessage(params: {
  namaTim: string;
  warna: string;
  buktiTransfer: string;
  teamSlug: string;
}) {
  const { namaTim, warna, buktiTransfer, teamSlug } = params;
  
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

  try {
    const res = await discordAPI(`/channels/${DISCORD_CONFIG.CH_BUKTI}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error(`Gagal kirim Finance msg untuk ${namaTim}:`, error);
    return null;
  }
}
