import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';
import {
  buildNewRescheduleIso,
  formatConfirmationWIB,
} from '@/app/tournament/_library/reschedule-helper';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://teamwars.web.id';

export async function handleRescheduleCommand(interaction: any) {
  const channelId = interaction.channel_id;
  const userRoles: string[] = interaction.member?.roles || [];
  const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

  // 🔒 1. Validasi Akses Admin
  if (!isAdmin) {
    return {
      type: 4,
      data: {
        content: '⛔ **Akses Ditolak!** Perintah `/reschedule` hanya dapat dijalankan oleh Admin turnamen.',
        flags: 64,
      },
    };
  }

  // 🔒 2. Validasi Channel & Temukan Data Match
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const matchIndex = schedules.findIndex((m) => (m as any).discordChannelId === channelId);

  if (matchIndex === -1) {
    return {
      type: 4,
      data: {
        content: '⛔ **Akses Ditolak!** Perintah `/reschedule` wajib dijalankan langsung di dalam **Channel Match** yang bersangkutan.',
        flags: 64,
      },
    };
  }

  const match = schedules[matchIndex];

  // 🔒 3. Proteksi Match yang Sudah Selesai
  if (match.isFinished) {
    return {
      type: 4,
      data: {
        content: '⚠️ **Gagal Reschedule!** Pertandingan ini sudah ditandai selesai (`isFinished: true`) dan tidak dapat diubah lagi.',
        flags: 64,
      },
    };
  }

  // Ambil input argumen
  const options = interaction.data?.options || [];
  const optTanggal = options.find((o: any) => o.name === 'tanggal')?.value;
  const optJam = options.find((o: any) => o.name === 'jam')?.value;
  const optUpdateRecap = options.find((o: any) => o.name === 'update_recap')?.value ?? false;

  // 🔒 4. Validasi Kelengkapan Opsi
  if (!optTanggal && !optJam) {
    return {
      type: 4,
      data: {
        content: '⚠️ **Input Kurang Lengkap!** Masukkan minimal salah satu opsi: `tanggal` baru atau `jam` baru.',
        flags: 64,
      },
    };
  }

  // ⚡ 5. Susun ISO Date Baru
  let newMatchDateIso: string;
  try {
    newMatchDateIso = buildNewRescheduleIso(match.matchDate, optTanggal, optJam);
  } catch (err: any) {
    return {
      type: 4,
      data: { content: `⚠️ **Gagal Format Waktu:** ${err.message}`, flags: 64 },
    };
  }

  const oldScheduleFormatted = formatConfirmationWIB(match.matchDate);
  const newScheduleFormatted = formatConfirmationWIB(newMatchDateIso);

  // 🚀 6. Simpan Perubahan ke KV
  match.matchDate = newMatchDateIso;
  schedules[matchIndex] = match;
  await kv.set('twi:schedules', schedules);

  // ⚡ 7. Ambil Data Tim & Update Opening Embed
  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);

  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`),
    kv.hgetall<any>(`teams:${slugB}`),
  ]);

  // Resolusi Emoji Tim persis seperti setup channel awal
  const emojiA =
    teamA?.discordEmoji ||
    teamA?.emoji ||
    (teamA?.emojiId ? `<:${teamA?.kodeTim || 'team'}:${teamA?.emojiId}>` : undefined);

  const emojiB =
    teamB?.discordEmoji ||
    teamB?.emoji ||
    (teamB?.emojiId ? `<:${teamB?.kodeTim || 'team'}:${teamB?.emojiId}>` : undefined);

  const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
    channelId,
    matchId: match.id,
    groupName: match.groupName,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    kodeTimA: teamA?.kodeTim || slugA.toUpperCase(),
    kodeTimB: teamB?.kodeTim || slugB.toUpperCase(),
    teamAEmoji: emojiA,
    teamBEmoji: emojiB,
    emojiAId: teamA?.emojiId,
    emojiBId: teamB?.emojiId,
    roleAId: teamA?.discordRoleId || teamA?.roleId || '',
    roleBId: teamB?.discordRoleId || teamB?.roleId || '',
    weekName: `Week ${match.weekNumber || 1}`,
    matchDateIso: newMatchDateIso,
    refereeName: match.refereeDiscordId ? `<@${match.refereeDiscordId}>` : match.referee,
    refereeDiscordId: match.refereeDiscordId,
    streamerName: match.streamerDiscordId ? `<@${match.streamerDiscordId}>` : match.streamer,
    streamerDiscordId: match.streamerDiscordId,
    streamLink: match.streamLink,
    existingMsgId: (match as any).openingMsgId, // Mengirimkan ID lama memastikan tidak ada mention/tag role tim
    isFinished: false,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
  });

  if (newOpeningMsgId && (match as any).openingMsgId !== newOpeningMsgId) {
    schedules[matchIndex] = { ...match, openingMsgId: newOpeningMsgId } as any;
    await kv.set('twi:schedules', schedules);
  }

  // 🚀 8. Trigger Recap di Latar Belakang (Non-Blocking)
  if (optUpdateRecap) {
    const targetWeekStr = `Week ${match.weekNumber || 1}`;
    fetch(`${APP_URL}/api/tournament/weekly-recap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWeek: targetWeekStr }),
    }).catch((err) => console.error('[RESCHEDULE RECAP ASYNC ERROR]:', err));
  }

  // 📝 9. Respons Konfirmasi Instan
  return {
    type: 4,
    data: {
      content:
        `✅ **Jadwal Pertandingan Berhasil Di-Reschedule!**\n\n` +
        `⚔️ **Match:** \`${match.id.toUpperCase()}\` (${match.teamAName} vs ${match.teamBName})\n` +
        `⏱️ **Jadwal Semula:** ${oldScheduleFormatted}\n` +
        `📅 **Jadwal Baru:** **${newScheduleFormatted}**\n\n` +
        `📌 *Opening message telah diperbarui${optUpdateRecap ? ' & sinkronisasi recap sedang berjalan' : ''}.*`,
      flags: 64,
    },
  };
}
