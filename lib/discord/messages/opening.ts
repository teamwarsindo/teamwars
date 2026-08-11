import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';
import { DIVISION_MAP } from '@/lib/types/tournament'; // 🟢 Import DIVISION_MAP

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
  if (!dateIso) return 'Belum ditentukan';
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return 'Belum ditentukan';
  
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }) +
    ', ' +
    d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
      .replace('.', '.') +
    ' WIB'
  );
}

export async function sendOrUpdateOpeningEmbed(params: OpeningEmbedParams): Promise<string | null> {
  if (!params.channelId) return null;

  const isFirstOpening = !params.existingMsgId;

  // Resolusi Emoji
  const emojiA =
    params.teamAEmoji ||
    (params.emojiAId ? `<:${(params.kodeTimA || 'team').replace(/\s+/g, '')}:${params.emojiAId}>` : '');

  const emojiB =
    params.teamBEmoji ||
    (params.emojiBId ? `<:${(params.kodeTimB || 'team').replace(/\s+/g, '')}:${params.emojiBId}>` : '');

  // Logika Wasit & Streamer
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
  const isFinished = params.isCompleted || false;

  const scheduleChannelMention = DISCORD_CONFIG.CH_SCHEDULE 
    ? `<#${DISCORD_CONFIG.CH_SCHEDULE}>` 
    : '#schedule-results';

  // Fields Embed
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

  // 🟢 PERBARUAN UTAMA: RESOLUSI NAMA DIVISI RESMI DILAKUKAN DI SINI!
  let groupDisplayName = params.groupName || 'Group Stage';
  if (groupDisplayName === 'Group A') {
    groupDisplayName = DIVISION_MAP.GROUP_A;
  } else if (groupDisplayName === 'Group B') {
    groupDisplayName = DIVISION_MAP.GROUP_B;
  }

  const weekDisplayName = params.weekName || 'Week 1';

  const embedData = {
    title: `🏆 ${groupDisplayName} - ${weekDisplayName}`, // 👈 Otomatis jadi "🏆 SAKURASAWA FIGHTERS - Week 2"
    description: `${teamADisplay} **VS** ${teamBDisplay}\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
    color: isFinished ? 0x2ecc71 : 0x00a8fc,
    fields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  // 🗑️ 1. HAPUS PESAN LAMA JIKA ADA
  if (params.existingMsgId) {
    await discordAPI(
      `/channels/${params.channelId}/messages/${params.existingMsgId}`,
      'DELETE'
    ).catch(() => null);
  }

  // 📩 2. POST PESAN BARU DI PALING BAWAH
  const roleAMention = params.roleAId ? `<@&${params.roleAId}>` : `**${params.teamAName}**`;
  const roleBMention = params.roleBId ? `<@&${params.roleBId}>` : `**${params.teamBName}**`;

  const postPayload: any = {
    embeds: [embedData],
  };

  if (isFirstOpening) {
    postPayload.content = `${roleAMention} ${roleBMention}`;
  }

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', postPayload).catch(() => null);
  return res?.id || null;
}