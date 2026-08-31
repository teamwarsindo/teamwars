import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';
import {
  buildNewRescheduleIso,
  formatConfirmationWIB,
  getAvailableRescheduleSlots,
} from '@/app/tournament/_library/reschedule-helper';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://teamwars.web.id';

// ============================================================================
// 1. AUTOCOMPLETE HANDLER (Type 8)
// ============================================================================
export async function handleRescheduleAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const options = interaction.data?.options || [];
    const focusedOption = options.find((opt: any) => opt.focused);
    if (!focusedOption || focusedOption.name !== 'tanggal') {
      return { type: 8, data: { choices: [] } };
    }

    const query = (focusedOption.value || '').toString().toLowerCase();
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m: any) => m.discordChannelId === channelId);

    if (!match) return { type: 8, data: { choices: [] } };

    const availableSlots = getAvailableRescheduleSlots(schedules, match);

    const choices = availableSlots
      .filter((s) => s.name.toLowerCase().includes(query) || s.value.toLowerCase().includes(query))
      .slice(0, 25);

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error reschedule autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ============================================================================
// 2. BACKGROUND WORKER (Followup Edit Original Message)
// ============================================================================
async function executeRescheduleBackground(interaction: any) {
  const { application_id, token, channel_id: channelId } = interaction;
  const webhookUrl = `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`;

  const sendWebhookResponse = async (content: string) => {
    try {
      await fetch(webhookUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      console.error('[RESCHEDULE WEBHOOK ERROR]:', err);
    }
  };

  try {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => (m as any).discordChannelId === channelId);

    if (matchIndex === -1) {
      await sendWebhookResponse('⛔ **Akses Ditolak!** Perintah `/reschedule` wajib dijalankan di dalam **Channel Match** yang bersangkutan.');
      return;
    }

    const match = schedules[matchIndex];

    if (match.isFinished) {
      await sendWebhookResponse('⚠️ **Gagal Reschedule!** Pertandingan ini sudah ditandai selesai (`isFinished: true`) dan tidak dapat diubah lagi.');
      return;
    }

    const options = interaction.data?.options || [];
    const optTanggal = options.find((o: any) => o.name === 'tanggal')?.value;
    const optJam = options.find((o: any) => o.name === 'jam')?.value;
    const optUpdateRecap = options.find((o: any) => o.name === 'update_recap')?.value ?? false;

    if (!optTanggal && !optJam) {
      await sendWebhookResponse('⚠️ **Input Kurang Lengkap!** Masukkan minimal salah satu opsi: `tanggal` baru atau `jam` baru.');
      return;
    }

    let newMatchDateIso: string;
    try {
      newMatchDateIso = buildNewRescheduleIso(match.matchDate, optTanggal, optJam);
    } catch (err: any) {
      await sendWebhookResponse(`⚠️ **Gagal Format Waktu:** ${err.message}`);
      return;
    }

    const oldScheduleFormatted = formatConfirmationWIB(match.matchDate);
    const newScheduleFormatted = formatConfirmationWIB(newMatchDateIso);

    // 1. Simpan Jadwal Baru ke KV
    match.matchDate = newMatchDateIso;
    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    // 2. Update Opening Embed di Channel Match
    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);

    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${slugA}`),
      kv.hgetall<any>(`teams:${slugB}`),
    ]);

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
      existingMsgId: (match as any).openingMsgId,
      isFinished: false,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
    });

    if (newOpeningMsgId && (match as any).openingMsgId !== newOpeningMsgId) {
      schedules[matchIndex] = { ...match, openingMsgId: newOpeningMsgId } as any;
      await kv.set('twi:schedules', schedules);
    }

    // 3. Trigger Sinkronisasi Rekap Mingguan (jika opsi aktif)
    if (optUpdateRecap) {
      const targetWeekStr = `Week ${match.weekNumber || 1}`;
      try {
        await fetch(`${APP_URL}/api/tournament/weekly-recap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetWeek: targetWeekStr }),
        });
      } catch (err) {
        console.error('[RESCHEDULE RECAP ERROR]:', err);
      }
    }

    // 4. Kirim Konfirmasi Akhir ke User
    await sendWebhookResponse(
      `✅ **Jadwal Pertandingan Berhasil Di-Reschedule!**\n\n` +
      `⚔️ **Match:** \`${match.id.toUpperCase()}\` (${match.teamAName} vs ${match.teamBName})\n` +
      `⏱️ **Jadwal Semula:** ${oldScheduleFormatted}\n` +
      `📅 **Jadwal Baru:** **${newScheduleFormatted}**\n\n` +
      `📌 *Opening message telah diperbarui${optUpdateRecap ? ' & jadwal di channel rekap telah disinkronkan' : ''}.*`
    );
  } catch (error: any) {
    console.error('[EXECUTE RESCHEDULE ERROR]:', error);
    await sendWebhookResponse(`❌ **Terjadi kesalahan server saat reschedule:** ${error.message || error}`);
  }
}

// ============================================================================
// 3. COMMAND EXECUTION HANDLER (Type 5: Defer Instan < 100ms)
// ============================================================================
export async function handleRescheduleCommand(interaction: any) {
  const userRoles: string[] = interaction.member?.roles || [];
  const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

  // 🔒 1. Validasi Akses Admin Instan
  if (!isAdmin) {
    return {
      type: 4,
      data: {
        content: '⛔ **Akses Ditolak!** Perintah `/reschedule` hanya dapat dijalankan oleh Admin turnamen.',
        flags: 64,
      },
    };
  }

  // ⚡ 2. Eksekusi Proses Berat di Background (Async tanpa await blocking)
  executeRescheduleBackground(interaction);

  // 🚀 3. Balas Discord Langsung dengan Type 5 (Thinking State / Ephemeral)
  return {
    type: 5,
    data: {
      flags: 64, // Pesan hanya terlihat oleh admin pemanggil perintah
    },
  };
        }
