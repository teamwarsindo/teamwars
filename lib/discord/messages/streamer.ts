import { DISCORD_CONFIG } from '../config';
import { discordAPI } from '../utils';

export async function sendOrUpdateStreamerSummaryEmbed(params: {
  weekName: string;
  matches: Array<{
    matchId: string;
    groupName?: string;
    teamAName: string;
    teamBName: string;
    matchChannelId?: string;
    matchDateIso?: string;
    refereeName?: string;
    refereeDiscordId?: string;
    streamerName?: string;
    streamerDiscordId?: string;
    streamLink?: string;
  }>;
  existingMsgIds?: Record<string, string>;
}): Promise<Record<string, string>> {
  const targetChannelId = DISCORD_CONFIG.CH_STREAMER;
  const updatedMsgIds: Record<string, string> = { ...(params.existingMsgIds || {}) };

  if (!targetChannelId || params.matches.length === 0) return updatedMsgIds;

  // Susun daftar field pertandingan untuk match terkait
  const fields = params.matches.map((m) => {
    const cleanMatchNum = m.matchId.replace('match-', '');
    const formattedWIB = m.matchDateIso
      ? new Date(m.matchDateIso).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      : 'Belum tersedia';

    const refereeDisplay = m.refereeDiscordId
      ? `<@${m.refereeDiscordId}>`
      : m.refereeName && m.refereeName.trim() !== ''
      ? m.refereeName
      : 'Belum tersedia';

    const streamerDisplay = m.streamerDiscordId
      ? `<@${m.streamerDiscordId}>`
      : m.streamerName && m.streamerName.trim() !== ''
      ? m.streamerName
      : 'Belum tersedia';

    const streamLinkDisplay = m.streamLink && m.streamLink.trim() !== ''
      ? `[Nonton Live Streaming](${m.streamLink})`
      : 'Belum tersedia';

    const matchChannelDisplay = m.matchChannelId ? `<#${m.matchChannelId}>` : 'Belum tersedia';

    const streamerRules = 
      "• Jadwal bisa berubah sesuaikan kesepakatan kedua tim\n" +
      "• Klaim jadwal ke Admin Discord";

    return {
      name: `⚔️ M${cleanMatchNum}: ${m.teamAName} VS ${m.teamBName}`,
      value: 
        `📅 **Jadwal Pertandingan:** ${formattedWIB}\n` +
        `📍 **Channel Match:** ${matchChannelDisplay}\n` +
        `⚖️ **Referee:** ${refereeDisplay}\n` +
        `🎥 **Streamer:** ${streamerDisplay}\n` +
        `📺 **Live Stream:** ${streamLinkDisplay}\n` +
        `📌 **Catatan Streamer:**\n${streamerRules}`,
      inline: false,
    };
  });

  const embedObject = {
    title: `📢 PILAH JADWAL MATCH - ${params.weekName.toUpperCase()}`,
    color: 0xf1c40f,
    description: `Halo Referee & Streamer! Silakan cek jadwal pertandingan **${params.weekName}** di bawah dan klaim match yang ingin kamu tangani.`,
    fields: fields.slice(0, 25),
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const currentMatchKey = `match_${params.matches[0].matchId}`;
  const existingMsgId = updatedMsgIds[currentMatchKey];

  // Jika embed SUDAH ADA ➔ Gunakan PATCH untuk edit tanpa tag ulang
  if (existingMsgId) {
    const editRes = await discordAPI(`/channels/${targetChannelId}/messages/${existingMsgId}`, 'PATCH', {
      embeds: [embedObject],
    }).catch(() => null);

    if (!editRes) {
      // Fallback jika pesan di Discord terhapus manual
      const pingContent = `<@&${DISCORD_CONFIG.ROLE_REFEREE}> <@&${DISCORD_CONFIG.ROLE_STREAMER}>`;
      const newRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
        content: pingContent,
        embeds: [embedObject],
      }).catch(() => null);
      if (newRes?.id) updatedMsgIds[currentMatchKey] = newRes.id;
    }
  } else {
    // Jika PERTAMA KALI ➔ Gunakan POST dengan tag role Referee & Streamer
    const pingContent = `<@&${DISCORD_CONFIG.ROLE_REFEREE}> <@&${DISCORD_CONFIG.ROLE_STREAMER}>`;
    const newRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
      content: pingContent,
      embeds: [embedObject],
    }).catch(() => null);
    if (newRes?.id) updatedMsgIds[currentMatchKey] = newRes.id;
  }

  return updatedMsgIds;
        }
