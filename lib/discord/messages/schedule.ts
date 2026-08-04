import { DISCORD_CONFIG } from '../config';
import { discordAPI } from '../utils';

export async function sendOrUpdateScheduleEmbed(params: {
  groupName?: string;
  weekName?: string;
  teamAName: string;
  teamBName: string;
  kodeTimA?: string;
  kodeTimB?: string;
  emojiAId?: string;
  emojiBId?: string;
  matchDateIso?: string;
  existingMsgId?: string;
}): Promise<string | null> {
  const targetChannelId = DISCORD_CONFIG.CH_SCHEDULE;
  if (!targetChannelId) return null;

  // 1. Format Waktu WIB
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
    : 'Belum tersedia';

  // 2. Format Emoji & Tampilan Tim
  const emojiATag = params.emojiAId && params.kodeTimA ? `<:${params.kodeTimA}:${params.emojiAId}> ` : '';
  const emojiBTag = params.emojiBId && params.kodeTimB ? `<:${params.kodeTimB}:${params.emojiBId}> ` : '';

  // 3. Title Menggunakan groupName
  const stageTitle = params.groupName
    ? `🏆 ${params.groupName} - ${params.weekName || 'Week 1'}`
    : `🏆 Group Stage - ${params.weekName || 'Week 1'}`;

  // 4. Payload Embed Ringkas
  const embedObject = {
    title: stageTitle,
    color: 0x2ecc71,
    description: `${emojiATag}**${params.teamAName}** VS ${emojiBTag}**${params.teamBName}**`,
    fields: [
      { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  if (params.existingMsgId) {
    const editRes = await discordAPI(`/channels/${targetChannelId}/messages/${params.existingMsgId}`, 'PATCH', {
      embeds: [embedObject],
    }).catch(() => null);

    if (editRes?.id) return editRes.id;
  }

  const postRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
    embeds: [embedObject],
  }).catch(() => null);

  return postRes?.id || null;
}