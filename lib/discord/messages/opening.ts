import { discordAPI } from '../utils';

export async function sendOrUpdateOpeningEmbed(params: {
  channelId: string;
  matchId: string;
  teamAName: string;
  teamBName: string;
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

  // 1. Hapus pesan opening lama jika ID-nya tercatat di Redis
  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Teks Tanggal WIB
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

  // 3. Format Penampilan Referee, Streamer, & Stream Link
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

  // 4. Content Teks Tag Role Tim (Hanya dikirim pertama kali channel terbuat)
  const roleATag = params.roleAId ? `<@&${params.roleAId}>` : `**${params.teamAName}**`;
  const roleBTag = params.roleBId ? `<@&${params.roleBId}>` : `**${params.teamBName}**`;

  const pingContent = isFirstTime ? `${roleATag} ${roleBTag}` : undefined;

  // 5. Info Reschedule Format Poin Singkat
  const rescheduleInfoText = 
    "• **Persetujuan:** Kedua tim wajib setuju.\n" +
    "• **Hari Tanding:** Rabu s.d. Minggu.\n" +
    "• **Batas Harian:** Maksimal 3 match per hari.\n" +
    "• **Konfirmasi:** Wajib lapor ke **Admin Discord**.";

  // 6. Draft Embed Payload
  const embedPayload: any = {
    content: pingContent,
    embeds: [
      {
        title: `🏆 Group Stage - ${params.weekName || 'Week 1'}`,
        color: 0x00d2ff,
        description: `**${params.teamAName}** VS **${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
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
  };

  // 7. Kirim Pesan Baru
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', embedPayload);
  return res?.id || null;
}