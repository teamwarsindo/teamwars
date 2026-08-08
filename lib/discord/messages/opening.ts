import { discordAPI } from '../utils';

export interface OpeningEmbedParams {
  channelId: string;
  matchId: string;
  groupName?: string;
  weekName?: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  kodeTimA?: string;
  kodeTimB?: string;
  emojiAId?: string;
  emojiBId?: string;
  roleAId?: string;
  roleBId?: string;
  matchDateIso?: string;
  refereeName?: string;
  refereeDiscordId?: string;
  streamerName?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  existingMsgId?: string | null;
  isCompleted?: boolean;
  scoreA?: number;
  scoreB?: number;
}

function formatWIBDate(dateIso?: string): string {
  if (!dateIso) return 'TBA';
  const d = new Date(dateIso);
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' at ' +
    d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
      .replace('.', ':') +
    ' WIB'
  );
}

export async function sendOrUpdateOpeningEmbed(params: OpeningEmbedParams): Promise<string | null> {
  if (!params.channelId) return null;

  // Resolusi Emoji A: Gunakan tag KV utuh jika ada, jika tidak fallback ke emojiAId + kodeTimA, jika tidak ada fallback ke kosong
  const emojiA =
    params.teamAEmoji ||
    (params.emojiAId ? `<:${(params.kodeTimA || 'team').replace(/\s+/g, '')}:${params.emojiAId}>` : '');

  // Resolusi Emoji B
  const emojiB =
    params.teamBEmoji ||
    (params.emojiBId ? `<:${(params.kodeTimB || 'team').replace(/\s+/g, '')}:${params.emojiBId}>` : '');

  const roleAStr = params.roleAId ? `<@&${params.roleAId}>` : `**${params.teamAName}**`;
  const roleBStr = params.roleBId ? `<@&${params.roleBId}>` : `**${params.teamBName}**`;

  const teamADisplay = `${emojiA ? emojiA + ' ' : ''}${roleAStr}`;
  const teamBDisplay = `${emojiB ? emojiB + ' ' : ''}${roleBStr}`;

  const isFinished = params.isCompleted || false;
  const refText = params.refereeDiscordId ? `<@${params.refereeDiscordId}>` : params.refereeName || 'TBA';
  const strmText = params.streamerDiscordId ? `<@${params.streamerDiscordId}>` : params.streamerName || 'TBA';

  const fields: any[] = [
    { name: '⚖️ Referee', value: refText, inline: true },
    { name: '🎥 Streamer', value: strmText, inline: true },
    { name: '📅 Waktu Match', value: formatWIBDate(params.matchDateIso), inline: false },
  ];

  if (isFinished) {
    fields.push({
      name: '🏆 Hasil Pertandingan',
      value: `**${params.teamAName}** [ ${params.scoreA ?? 0} - ${params.scoreB ?? 0} ] **${params.teamBName}**`,
      inline: false,
    });
  }

  if (params.streamLink) {
    fields.push({ name: '📺 Link Streaming', value: params.streamLink, inline: false });
  }

  const payload = {
    content: `${roleAStr} VS ${roleBStr}`,
    embeds: [
      {
        title: isFinished ? '🏁 Pertandingan Selesai' : '⚔️ Pertandingan Dimulai!',
        description: `**${params.groupName || 'Group Stage'}** • **${params.weekName || 'Week 1'}**\n\n${teamADisplay} **VS** ${teamBDisplay}`,
        color: isFinished ? 0x2ecc71 : 0xf1c40f,
        fields,
        footer: { text: `Match ID: ${params.matchId} • TWI Season 7` },
      },
    ],
  };

  if (params.existingMsgId) {
    const res = await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'PATCH', payload).catch(() => null);
    if (res?.id) return res.id;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', payload).catch(() => null);
  return res?.id || null;
}