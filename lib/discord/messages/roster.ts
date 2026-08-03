import { discordAPI, hexToDecimal, getFooterText } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function sendRosterMessage(params: {
  namaTim: string;
  warna: string;
  ketua: any;
  wakil: any;
  players: any[];
  logoTim: string;
  createdAt: string;
  channelId?: string;  // Parameter opsional
  categoryId?: string; // Parameter opsional
}) {
  const { namaTim, warna, ketua, wakil, players, logoTim, createdAt, channelId } = params;

  const playerListString = players.map(p => `${p.ign} (${p.idDuelLinks || p.duelId})`).join('\n');

  const payload = {
    embeds: [{
      title: namaTim,
      color: hexToDecimal(warna),
      thumbnail: { url: logoTim },
      fields: [
        { name: "Ketua", value: ketua.ign, inline: true },
        { name: "Wakil", value: wakil.ign, inline: true },
        { name: "Players", value: playerListString, inline: false }
      ],
      footer: { text: getFooterText(createdAt) }
    }]
  };

  // Gunakan channelId dari input, jika kosong fallback ke config
  const targetChannel = channelId || DISCORD_CONFIG.CH_ROSTER;

  try {
    const res = await discordAPI(`/channels/${targetChannel}/messages`, 'POST', payload);
    return res?.id || null;
  } catch (error) {
    console.error(`Gagal kirim Roster msg untuk ${namaTim}:`, error);
    return null;
  }
}
