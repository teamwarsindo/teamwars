import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { waitUntil } from '@vercel/functions';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';
import {
  buildNewRescheduleIso,
  formatConfirmationWIB,
} from '@/lib/discord/commands/reschedule/types';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import { discordAPI } from '@/lib/discord/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://teamwars.web.id';

export async function handleRescheduleCommand(body: any) {
  try {
    const userRoles: string[] = body.member?.roles || [];
    const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

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
                content: '⚠️ **Gagal Reschedule!** Pertandingan ini sudah selesai (`isFinished: true`) dan tidak dapat diubah.',
              });
            }
            return;
          }

          const newMatchDateIso = buildNewRescheduleIso(match.matchDate, optTanggal, optJam);
          const oldScheduleFormatted = formatConfirmationWIB(match.matchDate);
          const newScheduleFormatted = formatConfirmationWIB(newMatchDateIso);

          match.matchDate = newMatchDateIso;
          (match as any).isRescheduled = true;
          schedules[matchIndex] = match;
          await kv.set('twi:schedules', schedules);

          // Hapus embed rekap publik buatan admin jika ada
          const recapKvKey = `twi:match_recap_msg:${match.id}`;
          const existingRecapMsgId = await kv.get<string>(recapKvKey);
          if (existingRecapMsgId) {
            await discordAPI(`/channels/${channelId}/messages/${existingRecapMsgId}`, 'DELETE').catch(() => null);
            await kv.del(recapKvKey);
          }

          const syncTasks: Promise<any>[] = [];

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
                isRescheduled: true,
              });
            } catch (embedError) {
              console.error('[OPENING EMBED ERROR]:', embedError);
            }

            if (newOpeningMsgId && (match as any).openingMsgId !== newOpeningMsgId) {
              schedules[matchIndex] = { ...match, openingMsgId: newOpeningMsgId } as any;
              await kv.set('twi:schedules', schedules);
            }
          })();
          syncTasks.push(openingTask);

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

          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content:
                `✅ **Jadwal Pertandingan Berhasil Di-Reschedule!**\n\n` +
                `⚔️ **Match:** \`${match.id.toUpperCase()}\` (${match.teamAName} vs ${match.teamBName})\n` +
                `⏱️ **Jadwal Semula:** ${oldScheduleFormatted}\n` +
                `📅 **Jadwal Baru:** **${newScheduleFormatted}**\n\n` +
                `📌 *Opening message channel telah diperbarui & tombol ketersediaan match dicabut.*`,
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