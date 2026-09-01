import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { waitUntil } from '@vercel/functions';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';
import {
  buildNewRescheduleIso,
  formatConfirmationWIB,
  getAvailableRescheduleSlots,
} from '@/app/tournament/_library/reschedule-helper';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import { discordAPI } from '@/lib/discord/utils';

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
// 2. COMMAND EXECUTION HANDLER (Type 5 + waitUntil)
// ============================================================================
export async function handleRescheduleCommand(body: any) {
  try {
    const userRoles: string[] = body.member?.roles || [];
    const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

    // 🔒 1. Validasi Akses Admin Instan
    if (!isAdmin) {
      return NextResponse.json({
        type: 4,
        data: {
          content: '⛔ **Akses Ditolak!** Perintah `/reschedule` hanya dapat dijalankan oleh Admin turnamen.',
          flags: 64,
        },
      });
    }

    const channelId = body.channel_id;
    const options = body.data?.options || [];
    const optTanggal = options.find((o: any) => o.name === 'tanggal')?.value;
    const optJam = options.find((o: any) => o.name === 'jam')?.value;
    const optUpdateRecap = options.find((o: any) => o.name === 'update_recap')?.value ?? true;

    if (!optTanggal && !optJam) {
      return NextResponse.json({
        type: 4,
        data: {
          content: '⚠️ **Input Kurang Lengkap!** Masukkan minimal salah satu opsi: `tanggal` baru atau `jam` baru.',
          flags: 64,
        },
      });
    }

    const token = body.token;
    const appId = body.application_id || process.env.DISCORD_CLIENT_ID;

    // ⚡ 2. Eksekusi Background Worker yang Dijaga oleh waitUntil
    waitUntil(
      (async () => {
        try {
          const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
          const matchIndex = schedules.findIndex((m) => (m as any).discordChannelId === channelId);

          if (matchIndex === -1) {
            if (appId && token) {
              await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
                content: '⛔ **Akses Ditolak!** Perintah `/reschedule` wajib dijalankan di dalam **Channel Match** terkait.',
              });
            }
            return;
          }

          const match = schedules[matchIndex];

          if (match.isFinished) {
            if (appId && token) {
              await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
                content: '⚠️ **Gagal Reschedule!** Pertandingan ini sudah ditandai selesai (`isFinished: true`) dan tidak dapat diubah lagi.',
              });
            }
            return;
          }

          const newMatchDateIso = buildNewRescheduleIso(match.matchDate, optTanggal, optJam);
          const oldScheduleFormatted = formatConfirmationWIB(match.matchDate);
          const newScheduleFormatted = formatConfirmationWIB(newMatchDateIso);

          // 💾 LANGKAH 1: SIMPAN PERUBAHAN JADWAL KE KV DULU
          match.matchDate = newMatchDateIso;
          schedules[matchIndex] = match;
          await kv.set('twi:schedules', schedules);

          // ⚡ LANGKAH 2: EKSEKUSI PEMBARUAN DISCORD (PARALEL)
          const syncTasks: Promise<any>[] = [];

          // Task A: Update Opening Embed di Channel Match
          const slugA = getTeamSlug(match.teamAName);
          const slugB = getTeamSlug(match.teamBName);

          const openingTask = (async () => {
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

            let newOpeningMsgId: string | null = null;
            try {
              newOpeningMsgId = await sendOrUpdateOpeningEmbed({
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
            } catch (embedError) {
              console.error('[OPENING EMBED NON-FATAL ERROR]:', embedError);
            }

            // Jika ada ID opening baru yang terbentuk, perbarui KV
            if (newOpeningMsgId && (match as any).openingMsgId !== newOpeningMsgId) {
              schedules[matchIndex] = { ...match, openingMsgId: newOpeningMsgId } as any;
              await kv.set('twi:schedules', schedules);
            }
          })();
          syncTasks.push(openingTask);

          // Task B: Trigger Sinkronisasi Rekap Mingguan
          if (optUpdateRecap) {
            const targetWeekStr = `Week ${match.weekNumber || 1}`;
            const recapTask = fetch(`${APP_URL}/api/tournament/weekly-recap`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetWeek: targetWeekStr }),
            }).catch((err) => console.error('[RESCHEDULE RECAP ERROR]:', err));

            syncTasks.push(recapTask);
          }

          await Promise.all(syncTasks);

          // 📝 LANGKAH 3: UPDATE PESAN ORIGINAL INTERACTION KE ADMIN
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content:
                `✅ **Jadwal Pertandingan Berhasil Di-Reschedule!**\n\n` +
                `⚔️ **Match:** \`${match.id.toUpperCase()}\` (${match.teamAName} vs ${match.teamBName})\n` +
                `⏱️ **Jadwal Semula:** ${oldScheduleFormatted}\n` +
                `📅 **Jadwal Baru:** **${newScheduleFormatted}**\n\n` +
                `📌 *Opening message channel telah diperbarui${optUpdateRecap ? ' & jadwal di channel rekap telah disinkronkan' : ''}.*`,
            });
          }
        } catch (err: any) {
          console.error('[BACKGROUND RESCHEDULE ERROR]:', err);
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: `❌ **Terjadi kesalahan saat reschedule:** ${err.message || err}`,
            });
          }
        }
      })()
    );

    // 🚀 3. Respon Instan Type 5 ke Discord (< 100ms)
    return NextResponse.json({
      type: 5,
      data: { flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling /reschedule command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses reschedule'}`, flags: 64 },
    });
  }
      }
