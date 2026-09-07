import { kv } from '@vercel/kv';
import { discordAPI, formatWIBDate, getEmbedFooterText } from '../utils';
import { DIVISION_MAP } from '@/app/tournament/_library';
import { getCheckMatchesComponent } from '@/lib/discord/buttons/check-matches';

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
  isRescheduled?: boolean;
}

export async function sendOrUpdateOpeningEmbed(params: OpeningEmbedParams): Promise<string | null> {
  if (!params.channelId) return null;

  // 🛡️ Proteksi Mandiri: Cek data match dari KV jika existingMsgId atau isRescheduled tidak dikirim
  let targetExistingMsgId = params.existingMsgId;
  let targetIsRescheduled = params.isRescheduled;

  if (targetExistingMsgId === undefined || targetIsRescheduled === undefined) {
    try {
      const schedules = (await kv.get<any[]>('twi:schedules')) || [];
      const currentMatch = schedules.find(
        (m) => m.id === params.matchId || m.discordChannelId === params.channelId
      );
      if (currentMatch) {
        if (targetExistingMsgId === undefined) targetExistingMsgId = currentMatch.openingMsgId || null;
        if (targetIsRescheduled === undefined) targetIsRescheduled = Boolean(currentMatch.isRescheduled);
      }
    } catch {
      // Fallback diam
    }
  }

  const isFirstOpening = !targetExistingMsgId;
  const isRescheduled = Boolean(targetIsRescheduled);

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

  if (isRescheduled) {
    fields.push({
      name: '📌 Status Jadwal',
      value: '• Jadwal telah disepakati kedua tim & disahkan Admin.',
      inline: false,
    });
  } else {
    fields.push({
      name: '📢 Ketentuan Reschedule',
      value:
        '• **Persetujuan:** Kedua tim wajib setuju.\n' +
        '• **Hari Tanding:** Rabu s.d. Minggu.\n' +
        '• **Batas Harian:** Maksimal 3 match per hari.\n' +
        '• **Cek Kuota:** Tekan tombol **📊 Cek Sisa Match Harian** di bawah.\n' +
        '• **Konfirmasi:** Wajib lapor ke **Admin Discord**.',
      inline: false,
    });
  }

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

  if (targetExistingMsgId) {
    await discordAPI(
      `/channels/${params.channelId}/messages/${targetExistingMsgId}`,
      'DELETE'
    ).catch(() => null);
  }

  const roleAMention = params.roleAId ? `<@&${params.roleAId}>` : `**${params.teamAName}**`;
  const roleBMention = params.roleBId ? `<@&${params.roleBId}>` : `**${params.teamBName}**`;

  const postPayload: any = {
    embeds: [embedData],
    components: isRescheduled ? [] : getCheckMatchesComponent(params.matchId),
  };

  if (isFirstOpening) {
    postPayload.content = `Silakan konfirmasi jadwal dan siapkan performa kalian untuk pertandingan ini ${roleAMention} ${roleBMention}`;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', postPayload).catch(() => null);
  return res?.id || null;
}