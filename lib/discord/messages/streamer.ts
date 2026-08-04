import { DISCORD_CONFIG } from '../config';
import { discordAPI } from '../utils';

export async function sendOrUpdateStreamerEmbed(params: {
  matchChannelId: string;
  matchId: string;
  teamAName: string;
  teamBName: string;
  matchDateIso?: string;
  refereeName?: string;
  refereeDiscordId?: string;
  streamerName?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  existingMsgId?: string;
}): Promise<string | null> {
  const targetChannelId = DISCORD_CONFIG.CH_STREAMER;
  if (!targetChannelId) return null;

  const formattedWIB = params.matchDateIso
    ? new Date(params.matchDateIso).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : 'Jadwal Belum Ditentukan';

  const refereeDisplay = params.refereeDiscordId
    ? `<@${params.refereeDiscordId}>`
    : params.refereeName && params.refereeName.trim() !== ''
    ? params.refereeName
    : '⏳ *Membutuhkan Wasit*';

  const streamerDisplay = params.streamerDiscordId
    ? `<@${params.streamerDiscordId}>`
    : params.streamerName && params.streamerName.trim() !== ''
    ? params.streamerName
    : '⏳ *Membutuhkan Streamer*';

  const streamLinkDisplay = params.streamLink && params.streamLink.trim() !== ''
    ? `[Link Streaming](${params.streamLink})`
    : '-';

  const embedObject = {
    title: '🎮 PENUGASAN WASIT & STREAMER',
    color: 0xf1c40f,
    description: `**${params.teamAName}** VS **${params.teamBName}**`,
    fields: [
      { name: '📍 Channel Match', value: `<#${params.matchChannelId}>`, inline: false },
      { name: '📅 Waktu Pertandingan', value: formattedWIB, inline: false },
      { name: '⚖️ Wasit', value: refereeDisplay, inline: true },
      { name: '🎥 Streamer', value: streamerDisplay, inline: true },
      { name: '📺 Live Stream', value: streamLinkDisplay, inline: false },
    ],
    footer: { text: `Match ID: ${params.matchId} • TWI Season 7` },
  };

  // 🔄 JIKA SUDAH ADA PESAN LAMA: EDIT PESAN (TANPA PING ROLE RE-TAG)
  if (params.existingMsgId) {
    const editPayload = { embeds: [embedObject] };
    const updated = await discordAPI(`/channels/${targetChannelId}/messages/${params.existingMsgId}`, 'PATCH', editPayload);
    if (updated) return params.existingMsgId;
  }

  // 🟢 JIKA BUAT BARU: KIRIM BESERTA TAG ROLE RELEVANT
  const pingContent = `<@&${DISCORD_CONFIG.ROLE_REFEREE}> 📢 **JADWAL MATCH BARU DIBUKA!** Silakan cek penugasan match berikut:`;

  const newPayload = {
    content: pingContent,
    embeds: [embedObject],
  };

  const res = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', newPayload);
  return res?.id || null;
}