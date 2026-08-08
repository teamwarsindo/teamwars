import { discordAPI } from '../utils';

export interface OpeningEmbedParams {
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
  isCompleted?: boolean;
  scoreA?: number;
  scoreB?: number;
}

export async function sendOrUpdateOpeningEmbed(params: OpeningEmbedParams): Promise<string | null> {
  if (!params.channelId) return null;

  const isFirstTime = !params.existingMsgId;

  // 1. Hapus pesan opening lama jika ini adalah update
  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Role & Emoji
  const emojiA = params.emojiAId ? `<:${params.teamAName}:${params.emojiAId}>` : '';
  const emojiB = params.emojiBId ? `<:${params.teamBName}:${params.emojiBId}>` : '';
  const tagRoleA = params.roleAId ? `<@&${params.roleAId}>` : params.teamAName;
  const tagRoleB = params.roleBId ? `<@&${params.roleBId}>` : params.teamBName;

  const refereeText = params.refereeDiscordId
    ? `<@${params.refereeDiscordId}>`
    : (params.refereeName || 'Belum tersedia');

  const streamerText = params.streamerDiscordId
    ? `<@${params.streamerDiscordId}>`
    : (params.streamerName || 'Belum tersedia');

  const streamLinkText = params.streamLink || 'Belum tersedia';

  // 3. Format Tanggal
  let formattedDate = 'Belum ditentukan';
  if (params.matchDateIso) {
    const d = new Date(params.matchDateIso);
    formattedDate = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }) + ' WIB';
  }

  // 4. Formatter Hasil Match (Jika Selesai)
  const scoreA = params.scoreA ?? 0;
  const scoreB = params.scoreB ?? 0;
  let winnerText = '';

  if (scoreA > scoreB) {
    winnerText = `${emojiA} **${params.teamAName}** defeated ${emojiB} **${params.teamBName}** with a score of **${scoreA}-${scoreB}**`;
  } else if (scoreB > scoreA) {
    winnerText = `${emojiB} **${params.teamBName}** defeated ${emojiA} **${params.teamAName}** with a score of **${scoreB}-${scoreA}**`;
  } else {
    winnerText = `${emojiA} **${params.teamAName}** tied with ${emojiB} **${params.teamBName}** with a score of **${scoreA}-${scoreB}**`;
  }

  // 5. Fields Embed
  const fields: any[] = [
    {
      name: '📅 Jadwal Pertandingan',
      value: formattedDate,
      inline: false,
    },
    {
      name: '⚖️ Referee',
      value: refereeText,
      inline: false,
    },
    {
      name: '🎥 Streamer',
      value: streamerText,
      inline: false,
    },
    {
      name: '📺 Live Stream',
      value: streamLinkText,
      inline: false,
    },
  ];

  if (params.isCompleted) {
    // Hapus reschedule, ganti dengan Skor Akhir
    fields.push({
      name: '📊 Hasil Pertandingan',
      value: winnerText,
      inline: false,
    });
  } else {
    // Skenario Aktif
    fields.push({
      name: '📢 Ketentuan Reschedule',
      value: '• **Persetujuan:** Kedua tim wajib setuju.\n• **Hari Tanding:** Rabu s.d. Minggu.\n• **Batas Harian:** Maksimal 3 match per hari.\n• **Konfirmasi:** Wajib lapor ke **Admin Discord**.',
      inline: false,
    });
  }

  // 6. Embed Payload Presisi
  const embedObject = {
    title: `🏆 ${params.groupName || 'GROUP B'} - ${params.weekName || 'Week 1'}`,
    description: params.isCompleted
      ? `🎉 **Pertandingan Telah Selesai!** Selamat kepada tim pemenang.\n\n${emojiA} **${params.teamAName}** VS ${emojiB} **${params.teamBName}**`
      : `${emojiA} **${params.teamAName}** VS ${emojiB} **${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
    color: params.isCompleted ? 0x2ecc71 : 0x00a8ff,
    fields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const payload: any = { embeds: [embedObject] };

  if (isFirstTime) {
    payload.content = `Perhatian ${tagRoleA} dan ${tagRoleB}!`;
  } else if (params.isCompleted) {
    payload.content = `🏆 Pertandingan Telah Selesai! ${tagRoleA} ${tagRoleB}`;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);

  return res?.id || null;
}