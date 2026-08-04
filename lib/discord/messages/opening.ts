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
  // 🟢 Guard Clause: return null jika channelId tidak valid
  if (!params.channelId) return null;

  // 1. Jika ada ID pesan lama, HAPUS PESAN LAMA terlebih dahulu
  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Emoji & Tag Role
  const emojiA = params.emojiAId ? `<:teamA:${params.emojiAId}>` : '';
  const emojiB = params.emojiBId ? `<:teamB:${params.emojiBId}>` : '';
  const tagRoleA = params.roleAId ? `<@&${params.roleAId}>` : params.teamAName;
  const tagRoleB = params.roleBId ? `<@&${params.roleBId}>` : params.teamBName;
  const tagReferee = params.refereeDiscordId ? `<@${params.refereeDiscordId}>` : (params.refereeName || 'TBA');
  const tagStreamer = params.streamerDiscordId ? `<@${params.streamerDiscordId}>` : (params.streamerName || 'TBA');

  // 3. Format Tanggal Pertandingan
  let formattedDate = 'TBA';
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

  // 4. Payload Embed Opening
  const embedObject = {
    title: `⚔️ ${params.groupName || 'GROUP STAGE'} - ${params.weekName || 'Week 1'}`,
    description: `Match pertandingan antara **${params.teamAName}** vs **${params.teamBName}**`,
    color: 0x3498db, // Warna Biru / Blue
    fields: [
      {
        name: '👥 Tim Bertanding',
        value: `${emojiA} ${tagRoleA}\n**VS**\n${emojiB} ${tagRoleB}`,
        inline: true,
      },
      {
        name: '📅 Jadwal tanding',
        value: `\`${formattedDate}\``,
        inline: true,
      },
      {
        name: '📋 Petugas Match',
        value: `Wasit: ${tagReferee}\nStreamer: ${tagStreamer}`,
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  // 5. Content Pesan Teks (Ping kedua Tim)
  const messageContent = `📢 **Match Opening Notice!**\nPerhatian untuk ${tagRoleA} dan ${tagRoleB}, harap bersiap sesuai jadwal.`;

  // 6. Kirim Pesan Ke Discord API
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    content: messageContent,
    embeds: [embedObject],
  }).catch(() => null);

  // 🟢 Pastikan selalu mengembalikan ID pesan atau null
  return res?.id || null;
    }
