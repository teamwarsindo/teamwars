import { discordAPI, formatWIBDate, getEmbedFooterText } from '../utils';
import { DISCORD_CONFIG } from '../config';
import { DIVISION_MAP } from '@/app/tournament/_library';

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
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
}

export async function sendOrUpdateOpeningEmbed(params: OpeningEmbedParams): Promise<string | null> {
  if (!params.channelId) return null;

  const isFirstOpening = !params.existingMsgId;

  const emojiA =
    params.teamAEmoji ||
    (params.emojiAId ? `<:${(params.kodeTimA || 'team').replace(/\s+/g, '')}:${params.emojiAId}>` : '');

  const emojiB =
    params.teamBEmoji ||
    (params.emojiBId ? `<:${(params.kodeTimB || 'team').replace(/\s+/g, '')}:${params.emojiBId}>` : '');

  let refText = 'Belum ditentukan';
  let strmText = 'Belum ditentukan';

  if (params.refereeDiscordId) {
    refText = `<@${params.refereeDiscordId}>`;
  } else if (params.refereeName && params.refereeName.trim() !== '' && params.refereeName !== 'Belum tersedia') {
    refText = params.refereeName;
  }

  if (params.streamerDiscordId) {
    strmText = `<@${params.streamerDiscordId}>`;
  } else if (params.streamerName && params.streamerName.trim() !== '' && params.streamerName !== 'Belum tersedia') {
    strmText = params.streamerName;
  }

  const liveStreamText = params.streamLink || 'Belum tersedia';
  const isFinished = params.isFinished || false;

  const scheduleChannelMention = DISCORD_CONFIG.CH_SCHEDULE 
    ? `<#${DISCORD_CONFIG.CH_SCHEDULE}>` 
    : '#schedule-results';

  const fields: any[] = [
    { name: '📅 Jadwal Pertandingan', value: formatWIBDate(params.matchDateIso), inline: false },
    { name: '⚖️ Referee', value: refText, inline: true },
    { name: '🎥 Streamer', value: strmText, inline: true },
    { name: '📺 Live Stream', value: liveStreamText, inline: false },
  ];

  if (isFinished) {
    fields.push({
      name: '🏆 Hasil Pertandingan',
      value: `**${params.teamAName}** [ ${params.scoreA ?? 0} - ${params.scoreB ?? 0} ] **${params.teamBName}**`,
      inline: false,
    });
  }

  fields.push({
    name: '📢 Ketentuan Reschedule',
    value:
      '• **Persetujuan:** Kedua tim wajib setuju.\n' +
      '• **Hari Tanding:** Rabu s.d. Minggu.\n' +
      '• **Batas Harian:** Maksimal 3 match per hari.\n' +
      `• **Cek Kuota:** ${scheduleChannelMention}\n` +
      '• **Konfirmasi:** Wajib lapor ke **Admin Discord**.',
    inline: false,
  });

  const teamADisplay = `${emojiA ? emojiA + ' ' : ''}**${params.teamAName}**`;
  const teamBDisplay = `${emojiB ? emojiB + ' ' : ''}**${params.teamBName}**`;

  let groupDisplayName = params.groupName || 'Group Stage';
  if (groupDisplayName === 'Group A') groupDisplayName = DIVISION_MAP.GROUP_A;
  else if (groupDisplayName === 'Group B') groupDisplayName = DIVISION_MAP.GROUP_B;

  const weekDisplayName = params.weekName || 'Week 1';

  const embedData = {
    title: `🏆 ${groupDisplayName} - ${weekDisplayName}`,
    description: `${teamADisplay} **VS** ${teamBDisplay}`,
    color: isFinished ? 0x2ecc71 : 0x00a8fc,
    fields,
    footer: { text: getEmbedFooterText() },
  };

  if (params.existingMsgId) {
    await discordAPI(
      `/channels/${params.channelId}/messages/${params.existingMsgId}`,
      'DELETE'
    ).catch(() => null);
  }

  const roleAMention = params.roleAId ? `<@&${params.roleAId}>` : `**${params.teamAName}**`;
  const roleBMention = params.roleBId ? `<@&${params.roleBId}>` : `**${params.teamBName}**`;

  const postPayload: any = {
    embeds: [embedData],
  };

  if (isFirstOpening) {
    postPayload.content = `Silakan konfirmasi jadwal dan siapkan performa kalian untuk pertandingan ini ${roleAMention} ${roleBMention}`;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', postPayload).catch(() => null);
  return res?.id || null;
}