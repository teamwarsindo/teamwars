import { discordAPI } from '../utils';

export async function sendOrUpdateOpeningEmbed(params: {
  channelId: string;
  matchId: string;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  kodeTimA?: string;
  kodeTimB?: string;
  emojiAId?: string;
  emojiBId?: string;
  roleAId?: string;
  roleBId?: string;
  weekName?: string;
  matchDateIso?: string;
  refereeName?: string;
  refereeDiscordId?: string;
  streamerName?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  existingMsgId?: string;
}): Promise<string | null> {
  const isFirstTime = !params.existingMsgId;

  // 1. Jika ada ID pesan lama, HAPUS PESAN LAMA terlebih dahulu
  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
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

  // 4. Format Penampilan Referee, Streamer, & Stream Link
  const refereeDisplay = params.refereeDiscordId
    ? `<@${params.refereeDiscordId}>`
    : params.refereeName && params.refereeName.trim() !== ''
    ? params.refereeName
    : 'Belum tersedia';

  const streamerDisplay = params.streamerDiscordId
    ? `<@${params.streamerDiscordId}>`
    : params.streamerName && params.streamerName.trim() !== ''
    ? params.streamerName
    : 'Belum tersedia';

  const streamLinkDisplay = params.streamLink && params.streamLink.trim() !== ''
    ? `[Nonton Live Streaming](${params.streamLink})`
    : 'Belum tersedia';

  // 5. Tag Role Tim A & Tim B (Hanya saat First Time)
  const roleATag = params.roleAId ? `<@&${params.roleAId}>` : `**${params.teamAName}**`;
  const roleBTag = params.roleBId ? `<@&${params.roleBId}>` : `**${params.teamBName}**`;

  const pingContent = isFirstTime ? `${roleATag} ${roleBTag}` : undefined;

  // 6. Title Menggunakan groupName (Contoh: "🏆 Group A - Week 1" atau fallback "🏆 Group Stage - Week 1")
  const stageTitle = params.groupName
    ? `🏆 ${params.groupName} - ${params.weekName || 'Week 1'}`
    : `🏆 Group Stage - ${params.weekName || 'Week 1'}`;

  // 7. Info Reschedule
  const rescheduleInfoText = 
    "• **Persetujuan:** Kedua tim wajib setuju.\n" +
    "• **Hari Tanding:** Rabu s.d. Minggu.\n" +
    "• **Batas Harian:** Maksimal 3 match per hari.\n" +
    "• **Konfirmasi:** Wajib lapor ke **Admin Discord**.";

  // 8. Kirim PESAN BARU via POST
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    content: pingContent,
    embeds: [
      {
        title: stageTitle,
        color: 0x00d2ff,
        description: `${emojiATag}**${params.teamAName}** VS ${emojiBTag}**${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Referee', value: refereeDisplay, inline: true },
          { name: '🎥 Streamer', value: streamerDisplay, inline: true },
          { name: '📺 Live Stream', value: streamLinkDisplay, inline: false },
          { name: '📢 Ketentuan Reschedule', value: rescheduleInfoText, inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  }).catch(() => null);

  const newMsgId = res?.id || null;
}
