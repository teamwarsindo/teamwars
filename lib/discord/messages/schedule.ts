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

  // 1. JIKA ADA PESAN LAMA ➔ HAPUS TERLEBIH DAHULU
  if (params.existingMsgId) {
    await discordAPI(`/channels/${targetChannelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Waktu WIB
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

  // 3. Format Emoji & Tampilan Tim
  const emojiATag = params.emojiAId && params.kodeTimA ? `<:${params.kodeTimA}:${params.emojiAId}> ` : '';
  const emojiBTag = params.emojiBId && params.kodeTimB ? `<:${params.kodeTimB}:${params.emojiBId}> ` : '';

  // 4. Title Menggunakan groupName
  const stageTitle = params.groupName
    ? `🏆 ${params.groupName} - ${params.weekName || 'Week 1'}`
    : `🏆 Group Stage - ${params.weekName || 'Week 1'}`;

  // 5. Kirim PESAN BARU via POST
  const postRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
    embeds: [
      {
        title: stageTitle,
        color: 0x2ecc71,
        description: `${emojiATag}**${params.teamAName}** VS ${emojiBTag}**${params.teamBName}**`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  }).catch(() => null);

  return postRes?.id || null;
}