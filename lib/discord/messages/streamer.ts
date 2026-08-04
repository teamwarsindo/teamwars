import { DISCORD_CONFIG } from '../config';
import { discordAPI } from '../utils';

export async function sendOrUpdateStreamerSummaryEmbed(params: {
  weekName: string;
  matches: Array<{
    matchId: string;
    groupName?: string;
    teamAName: string;
    teamBName: string;
    kodeTimA?: string;
    kodeTimB?: string;
    emojiAId?: string;
    emojiBId?: string;
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

  const currentMatch = params.matches[0];

  // 1. Format Tanggal WIB
  const formattedWIB = currentMatch.matchDateIso
    ? new Date(currentMatch.matchDateIso).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : 'Belum tersedia';

  // 2. Format Emoji & Tampilan Tim
  const emojiATag = currentMatch.emojiAId && currentMatch.kodeTimA ? `<:${currentMatch.kodeTimA}:${currentMatch.emojiAId}> ` : '';
  const emojiBTag = currentMatch.emojiBId && currentMatch.kodeTimB ? `<:${currentMatch.kodeTimB}:${currentMatch.emojiBId}> ` : '';

  // 3. Format Penampilan Referee, Streamer, & Live Stream
  const refereeDisplay = currentMatch.refereeDiscordId
    ? `<@${currentMatch.refereeDiscordId}>`
    : currentMatch.refereeName && currentMatch.refereeName.trim() !== ''
    ? currentMatch.refereeName
    : 'Belum tersedia';

  const streamerDisplay = currentMatch.streamerDiscordId
    ? `<@${currentMatch.streamerDiscordId}>`
    : currentMatch.streamerName && currentMatch.streamerName.trim() !== ''
    ? currentMatch.streamerName
    : 'Belum tersedia';

  const streamLinkDisplay = currentMatch.streamLink && currentMatch.streamLink.trim() !== ''
    ? `[Nonton Live Streaming](${currentMatch.streamLink})`
    : 'Belum tersedia';

  const matchChannelDisplay = currentMatch.matchChannelId ? `<#${currentMatch.matchChannelId}>` : 'Belum tersedia';

  // 4. Title Menggunakan groupName
  const stageTitle = currentMatch.groupName
    ? `🏆 ${currentMatch.groupName} - ${params.weekName || 'Week 1'}`
    : `🏆 Group Stage - ${params.weekName || 'Week 1'}`;

  // 5. Teks Ketentuan Tugas
  const streamerRulesText = 
    "• **Penyesuaian Jadwal:** Waktu bertanding dapat berubah sesuai kesepakatan resmi kedua tim.\n" +
    "• **Klaim Tugas:** Wajib melakukan konfirmasi dan klaim match melalui **Admin Discord**.";

  // 6. Payload Embed
  const embedObject = {
    title: stageTitle,
    color: 0xf1c40f,
    description: `${emojiATag}**${currentMatch.teamAName}** VS ${emojiBTag}**${currentMatch.teamBName}**\n\nSilakan cek detail jadwal pertandingan di bawah dan koordinasikan klaim match.`,
    fields: [
      { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
      { name: '📍 Channel Match', value: matchChannelDisplay, inline: false },
      { name: '⚖️ Referee', value: refereeDisplay, inline: true },
      { name: '🎥 Streamer', value: streamerDisplay, inline: true },
      { name: '📺 Live Stream', value: streamLinkDisplay, inline: false },
      { name: '📢 Ketentuan Tugas & Jadwal', value: streamerRulesText, inline: false },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const currentMatchKey = `match_${currentMatch.matchId}`;
  const existingMsgId = updatedMsgIds[currentMatchKey];

  if (existingMsgId) {
    const editRes = await discordAPI(`/channels/${targetChannelId}/messages/${existingMsgId}`, 'PATCH', {
      embeds: [embedObject],
    }).catch(() => null);

    if (!editRes) {
      const pingContent = `<@&${DISCORD_CONFIG.ROLE_REFEREE}> <@&${DISCORD_CONFIG.ROLE_STREAMER}>`;
      const newRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
        content: pingContent,
        embeds: [embedObject],
      }).catch(() => null);
      if (newRes?.id) updatedMsgIds[currentMatchKey] = newRes.id;
    }
  } else {
    const pingContent = `<@&${DISCORD_CONFIG.ROLE_REFEREE}> <@&${DISCORD_CONFIG.ROLE_STREAMER}>`;
    const newRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
      content: pingContent,
      embeds: [embedObject],
    }).catch(() => null);
    if (newRes?.id) updatedMsgIds[currentMatchKey] = newRes.id;
  }

  return updatedMsgIds;
}