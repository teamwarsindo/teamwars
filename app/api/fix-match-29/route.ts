import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { discordAPI, formatWIBDate, getEmbedFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { getMatchContext } from '@/lib/discord/services/staff-helpers';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const MATCH_ID = 'match-29';
    const RESULT_MSG_ID = '1543776228073279492';
    const ASSIGN_LOG_MSG_ID = '1543776228304101488';

    const CHANNEL_RESULTS_ID = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_SCHEDULE || '';
    const CHANNEL_ASSIGN_LOG_ID = DISCORD_CONFIG.CH_ASSIGN || '';

    // 1. Ambil & Perbarui Master Schedules di KV
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const idx = schedules.findIndex((m) => String(m.id).toLowerCase() === MATCH_ID.toLowerCase());

    if (idx === -1) {
      return NextResponse.json({ success: false, error: `Match ID ${MATCH_ID} tidak ditemukan di database.` }, { status: 404 });
    }

    const match = schedules[idx];
    const ctx = await getMatchContext(match);
    const matchChannelId = (match as any).discordChannelId;

    // Update Skor Resmi ke 10-7 (Tim A: 7, Tim B: 10)
    match.scoreA = 7;
    match.scoreB = 10;
    (match as any).score = '7-10';
    (match as any).winnerTeam = 'teamB';
    match.isFinished = true;

    schedules[idx] = match;
    await kv.set('twi:schedules', schedules);

    const teamADisplay = `${ctx.teamAEmoji ? ctx.teamAEmoji + ' ' : ''}**${match.teamAName}**`;
    const teamBDisplay = `${ctx.teamBEmoji ? ctx.teamBEmoji + ' ' : ''}**${match.teamBName}**`;

    // 2. PATCH Embed di #schedule-results (Format sendOfficialScoreLog)
    if (CHANNEL_RESULTS_ID) {
      await discordAPI(`/channels/${CHANNEL_RESULTS_ID}/messages/${RESULT_MSG_ID}`, 'PATCH', {
        embeds: [
          {
            description: `${teamBDisplay} defeated ${teamADisplay} with a score of **10-7**`,
            color: 0x22c55e,
          },
        ],
      }).catch(console.error);
    }

    // 3. PATCH Embed di #assignment-log (Format sendCompletedAssignmentLog)
    if (CHANNEL_ASSIGN_LOG_ID) {
      await discordAPI(`/channels/${CHANNEL_ASSIGN_LOG_ID}/messages/${ASSIGN_LOG_MSG_ID}`, 'PATCH', {
        embeds: [
          {
            title: '✅ Referee Assignment - COMPLETED',
            description: `${match.groupName || 'Group Stage'} • ${ctx.calculatedWeek || 'Week 4'}\n${teamADisplay} **vs** ${teamBDisplay}`,
            color: 0x2ecc71,
            fields: [
              { name: '📅 Waktu Pertandingan', value: formatWIBDate(match.matchDate), inline: false },
              { name: '🏆 Hasil Pertandingan', value: `**10-7 (${match.teamBName} win)**`, inline: false },
            ],
            footer: { text: getEmbedFooterText() },
          },
        ],
      }).catch(console.error);
    }

    // 4. POST Log Transparansi Revisi Skor ke Channel Match
    if (matchChannelId) {
      await discordAPI(`/channels/${matchChannelId}/messages`, 'POST', {
        embeds: [
          {
            title: '⚠️ REVISI / PEMBETULAN SKOR PERTANDINGAN',
            color: 0xf59e0b,
            description:
              `Terdapat perbaikan input skor resmi untuk pertandingan ini:\n\n` +
              `• **Skor Sebelumnya:** ${teamADisplay} \`6\` — \`10\` ${teamBDisplay}\n` +
              `• **Skor Resmi (Revisi):** ${teamADisplay} \`7\` — \`10\` ${teamBDisplay}\n\n` +
              `*Pembaruan telah disinkronkan ke rekap hasil resmi dan database jadwal.*`,
            footer: { text: getEmbedFooterText() },
          },
        ],
      }).catch(console.error);
    }

    revalidatePath('/tournament');
    revalidatePath('/admin/dashboard');

    return NextResponse.json({
      success: true,
      message: `Match ${MATCH_ID} scores successfully corrected to 10-7 and Discord embeds patched.`,
    });
  } catch (error: any) {
    console.error('Error fixing match-29:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
