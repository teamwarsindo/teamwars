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
  if (!params.channelId) return null;

  const isFirstTime = !params.existingMsgId;

  // 1. Hapus pesan opening lama jika ini adalah update
  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Role & Emoji
  const emojiA = params.emojiAId ? `<:teamA:${params.emojiAId}>` : '';
  const emojiB = params.emojiBId ? `<:teamB:${params.emojiBId}>` : '';
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

  // 4. Payload Embed Opening Presis Seperti Format Asli (FPF Darkfall)
  const embedObject = {
    title: `🏆 ${params.groupName || 'GROUP B'} - ${params.weekName || 'Week 1'}`,
    description: `${emojiA} **${params.teamAName}** VS ${emojiB} **${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
    color: 0x00a8ff, // Warna Biru Muda TWI
    fields: [
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
      {
        name: '📢 Ketentuan Reschedule',
        value: '• **Persetujuan:** Kedua tim wajib setuju.\n• **Hari Tanding:** Rabu s.d. Minggu.\n• **Batas Harian:** Maksimal 3 match per hari.\n• **Konfirmasi:** Wajib lapor ke **Admin Discord**.',
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  // 5. Kirim pesan (HANYA MENTION ROLE JIKA BARU PERTAMA KALI BUAT CHANNEL)
  const payload: any = { embeds: [embedObject] };
  if (isFirstTime) {
    payload.content = `Perhatian ${tagRoleA} dan ${tagRoleB}!`;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);

  return res?.id || null;
}
