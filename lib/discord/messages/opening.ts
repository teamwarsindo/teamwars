import { discordAPI } from '../utils';

export async function sendOrUpdateOpeningEmbed(params: {
  channelId: string;
  matchId: string;
  teamAName: string;
  teamBName: string;
  weekName?: string;
  matchDateIso?: string;
  refereeName?: string;
  refereeDiscordId?: string;
  streamerName?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  existingMsgId?: string;
}): Promise<string | null> {
  // 1. Hapus pesan opening lama jika ID-nya tercatat
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
    : 'Jadwal Belum Ditentukan';

  // 3. Format Penampilan Wasit, Streamer, & Stream Link
  const refereeDisplay = params.refereeDiscordId
    ? `<@${params.refereeDiscordId}> (${params.refereeName || 'Wasit'})`
    : params.refereeName && params.refereeName.trim() !== ''
    ? params.refereeName
    : 'Belum Ditugaskan';

  const streamerDisplay = params.streamerDiscordId
    ? `<@${params.streamerDiscordId}> (${params.streamerName || 'Streamer'})`
    : params.streamerName && params.streamerName.trim() !== ''
    ? params.streamerName
    : 'Belum Ditugaskan';

  const streamLinkDisplay = params.streamLink && params.streamLink.trim() !== ''
    ? `[Nonton Live Streaming](${params.streamLink})`
    : '-';

  // 4. Draft Embed Payload (Murni Info, Tanpa Tombol & Tanpa Tag)
  const embedPayload = {
    embeds: [
      {
        title: `🏆 Group Stage - ${params.weekName || 'Week 1'}`,
        color: 0x00d2ff,
        description: `**${params.teamAName}** VS **${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Wasit Bertugas', value: refereeDisplay, inline: true },
          { name: '🎥 Streamer', value: streamerDisplay, inline: true },
          { name: '📺 Live Stream', value: streamLinkDisplay, inline: false },
          {
            name: '📢 Informasi Reschedule',
            value:
              'Reschedule pertandingan diperbolehkan dengan syarat **kedua tim wajib setuju**. Pertandingan reschedule **hanya bisa dilaksanakan pada hari Rabu s.d. Minggu**, dengan batas maksimal **3 match per hari**. Setelah menemukan kesepakatan waktu baru, harap konfirmasikan ke **Admin Discord**.',
            inline: false,
          },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
  };

  // 5. Kirim Pesan Baru
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', embedPayload);
  return res?.id || null;
}