import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/app/tournament/_library/types';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import { DIVISION_MAP } from '@/app/tournament/_library';

function detectPlatform(url: string): string {
  const cleanUrl = url.toLowerCase();
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'YouTube';
  if (cleanUrl.includes('tiktok.com')) return 'TikTok';
  if (cleanUrl.includes('twitch.tv')) return 'Twitch';
  return 'YouTube';
}

function detectPlatformBadge(url: string): string {
  const cleanUrl = url.toLowerCase();
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'YouTube Live 🔴';
  if (cleanUrl.includes('tiktok.com')) return 'TikTok Live 🎵';
  if (cleanUrl.includes('twitch.tv')) return 'Twitch 🟣';
  return 'Live Streaming 📺';
}

function formatMatchScheduleAt(dateIso?: string): string {
  if (!dateIso) return 'Belum ditentukan';
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return 'Belum ditentukan';

  const dateStr = d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).replace('.', ':');

  return `${dateStr} at ${timeStr} WIB`;
}

export async function handleStreamCommand(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const opts = interaction.data?.options || [];
    const rawLink = (opts.find((o: any) => o.name === 'link')?.value || '').trim();

    if (!rawLink || !rawLink.startsWith('http')) {
      return {
        type: 4,
        data: { content: '❌ Mohon masukkan link URL streaming yang valid (diawali `http://` atau `https://`).', flags: 64 },
      };
    }

    // 1. Ambil data schedule & cari match berdasarkan channel tempat command dijalankan
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.discordChannelId === channelId);

    if (matchIndex === -1) {
      return {
        type: 4,
        data: {
          content: '❌ **Akses Ditolak!** Command ini hanya dapat dijalankan di dalam channel pertandingan aktif.',
          flags: 64,
        },
      };
    }

    const match = schedules[matchIndex];

    // 2. Validasi Match belum selesai
    if (match.isFinished) {
      return {
        type: 4,
        data: {
          content: `❌ Pertandingan **${match.id.toUpperCase()}** sudah dinyatakan selesai (\`isFinished: true\`).`,
          flags: 64,
        },
      };
    }

    // 3. Update streamLink di data match schedule
    match.streamLink = rawLink;

    // 🔴 4. SINKRONKAN LANGSUNG KE twi:match_reports
    const reportData = await kv.hget<any>('twi:match_reports', match.id);
    if (reportData) {
      reportData.metadata = {
        ...(reportData.metadata || {}),
        streamUrl: rawLink,
        streamPlatform: detectPlatform(rawLink),
      };
      await kv.hset('twi:match_reports', { [match.id]: reportData });
    }

    // 5. Update / Kirim Ulang Opening Embed di Channel Match
    const teamAData = (await kv.hgetall<any>(`teams:${match.teamAId}`)) || {};
    const teamBData = (await kv.hgetall<any>(`teams:${match.teamBId}`)) || {};

    const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
      channelId: match.discordChannelId!,
      matchId: match.id,
      groupName: match.groupName,
      weekName: `Week ${match.weekNumber || 1}`,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAEmoji: teamAData.emojiId ? `<:${(teamAData.kodeTim || 'twi').replace(/\s+/g, '')}:${teamAData.emojiId}>` : undefined,
      teamBEmoji: teamBData.emojiId ? `<:${(teamBData.kodeTim || 'twi').replace(/\s+/g, '')}:${teamBData.emojiId}>` : undefined,
      kodeTimA: teamAData.kodeTim,
      kodeTimB: teamBData.kodeTim,
      emojiAId: teamAData.emojiId,
      emojiBId: teamBData.emojiId,
      roleAId: teamAData.discordRoleId,
      roleBId: teamBData.discordRoleId,
      matchDateIso: match.matchDate,
      refereeName: match.referee,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: match.streamer,
      streamerDiscordId: match.streamerDiscordId,
      streamLink: rawLink,
      existingMsgId: match.openingMsgId || null,
      isFinished: match.isFinished,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
    });

    if (newOpeningMsgId) {
      match.openingMsgId = newOpeningMsgId;
    }

    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    // 6. Kirim Broadcast Pengumuman Live ke Channel Live
    const chLive = (DISCORD_CONFIG as any).CH_LIVE || DISCORD_CONFIG.CH_EXHI;
    if (chLive) {
      let groupDisplayName = match.groupName || 'Group Stage';
      if (groupDisplayName === 'Group A') groupDisplayName = DIVISION_MAP.GROUP_A;
      else if (groupDisplayName === 'Group B') groupDisplayName = DIVISION_MAP.GROUP_B;

      const emojiA = teamAData.emojiId ? `<:${(teamAData.kodeTim || 'twi').replace(/\s+/g, '')}:${teamAData.emojiId}> ` : '';
      const emojiB = teamBData.emojiId ? `<:${(teamBData.kodeTim || 'twi').replace(/\s+/g, '')}:${teamBData.emojiId}> ` : '';
      const streamerMention = match.streamerDiscordId ? `<@${match.streamerDiscordId}>` : (match.streamer || 'Streamer Official');
      const platformBadge = detectPlatformBadge(rawLink);
      const scheduleText = formatMatchScheduleAt(match.matchDate);

      const broadcastContent = `@everyone\n\n` +
        `🔴 **LIVE STREAMING NOW!**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏆 **${groupDisplayName} — Week ${match.weekNumber || 1}**\n` +
        `⚔️ ${emojiA}**${match.teamAName}** VS ${emojiB}**${match.teamBName}**\n\n` +
        `⏰ **Jadwal Match:** ${scheduleText}\n` +
        `🎥 **Streamer:** ${streamerMention}\n` +
        `🌐 **Platform:** ${platformBadge}\n\n` +
        `🔗 **Tonton Siaran Langsung di:**\n` +
        `${rawLink}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Saksikan pertarungan sengit Team Wars Indonesia Season 7!*`;

      await discordAPI(`/channels/${chLive}/messages`, 'POST', {
        content: broadcastContent,
      });
    }

    return {
      type: 4,
      data: {
        content: `✅ **Link Streaming Berhasil Disimpan & Disiarkan!**\n• URL: ${rawLink}\n• Embed channel match diperbarui.\n• Metadata match report disinkronkan.\n• Broadcast @everyone terkirim ke channel live!`,
        flags: 64,
      },
    };
  } catch (error: any) {
    console.error('Error handling stream command:', error);
    return {
      type: 4,
      data: { content: `❌ Gagal memproses stream command: ${error.message || error}`, flags: 64 },
    };
  }
}
