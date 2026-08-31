import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const MATCH_ID = '29';
    const RESULT_MSG_ID = '1543776228073279492';
    const ASSIGN_LOG_MSG_ID = '1543776228304101488';

    // Channel ID Discord
    const CHANNEL_RESULTS_ID = DISCORD_CONFIG.CHANNEL_RESULTS || '1146313797963628604';
    const CHANNEL_ASSIGN_LOG_ID = DISCORD_CONFIG.CHANNEL_ASSIGNMENT_LOG || '1268489860608299069';

    // 1. Ambil & Perbarui Master Schedules di KV (twi:schedules)
    const schedules = (await kv.get<any[]>('twi:schedules')) || [];
    const matchIdx = schedules.findIndex((m) => String(m.id) === MATCH_ID);

    let matchChannelId: string | null = null;
    let teamAName = 'Licht Dracarys';
    let teamBName = 'NOVA QUASAR';

    if (matchIdx !== -1) {
      schedules[matchIdx].scoreA = 7;
      schedules[matchIdx].scoreB = 10;
      schedules[matchIdx].score = '7-10';
      schedules[matchIdx].winnerTeam = 'teamB';
      schedules[matchIdx].isFinished = true;

      teamAName = schedules[matchIdx].teamAName || teamAName;
      teamBName = schedules[matchIdx].teamBName || teamBName;
      matchChannelId = schedules[matchIdx].discordChannelId || null;

      await kv.set('twi:schedules', schedules);
    }

    // 2. EDIT Embed di #schedule-results (Ganti skor 10-6 -> 10-7)
    await discordAPI(`/channels/${CHANNEL_RESULTS_ID}/messages/${RESULT_MSG_ID}`, 'PATCH', {
      embeds: [
        {
          description: `<:NOVAQUASAR:1270383186211242054> **NOVA QUASAR** defeated <:LichtDracarys:1270383177659056218> **Licht Dracarys**\nwith a score of **10-7**`,
          color: 0x22c55e,
        },
      ],
    }).catch(console.error);

    // 3. EDIT Embed di #assignment-log (Ganti skor 10-6 -> 10-7)
    await discordAPI(`/channels/${CHANNEL_ASSIGN_LOG_ID}/messages/${ASSIGN_LOG_MSG_ID}`, 'PATCH', {
      embeds: [
        {
          title: '✅ Referee Assignment - COMPLETED',
          color: 0x22c55e,
          description:
            `Anda Yakin? • Week 4\n` +
            `<:LichtDracarys:1270383177659056218> **${teamAName}** vs <:NOVAQUASAR:1270383186211242054> **${teamBName}**\n\n` +
            `📅 **Waktu Pertandingan**\nMinggu, 30 Agu 2026, 20:00 WIB\n\n` +
            `🏆 **Hasil Pertandingan**\n**10-7 (${teamBName} win)**`,
          footer: { text: getEmbedFooterText() },
        },
      ],
    }).catch(console.error);

    // 4. Kirim Log Pemberitahuan Perbaikan ke Channel Match
    if (matchChannelId) {
      await discordAPI(`/channels/${matchChannelId}/messages`, 'POST', {
        embeds: [
          {
            title: '⚠️ REVISI / PEMBETULAN SKOR PERTANDINGAN',
            color: 0xf59e0b,
            description:
              `Terdapat perbaikan input skor resmi untuk pertandingan ini:\n\n` +
              `• **Skor Sebelumnya:** \`10-6\`\n` +
              `• **Skor Resmi (Revisi):** **${teamAName} \`7\` — \`10\` ${teamBName}**\n\n` +
              `*Pembaruan telah disinkronkan ke channel rekap hasil dan database jadwal.*`,
            footer: { text: getEmbedFooterText() },
          },
        ],
      }).catch(console.error);
    }

    revalidatePath('/tournament');
    revalidatePath('/admin/dashboard');

    return NextResponse.json({
      success: true,
      message: 'Match 29 scores successfully updated to 10-7 and Discord embeds edited.',
    });
  } catch (error: any) {
    console.error('Error fixing match 29:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
        }
