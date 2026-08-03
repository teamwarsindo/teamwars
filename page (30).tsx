export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { TESTER_MATCH_DATA } from '@/lib/config-tester';
import { discordAPI } from '@/lib/discord/utils';

// Import Generator Message Terpisah
import { buildReminderEmbed } from '@/lib/discord/messages/reminderEmbed';
import { buildPrepareEmbed } from '@/lib/discord/messages/prepareEmbed';
import { createTimerControlEmbed } from '@/lib/discord/messages/timerControlEmbed';

// Helper Hapus Pesan Discord
async function deleteDiscordMessage(channelId: string, messageId?: string) {
  if (channelId && messageId) {
    try {
      await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'DELETE');
    } catch (err) {
      console.error(`Gagal menghapus pesan ${messageId} di channel ${channelId}:`, err);
    }
  }
}

// Helper Log Discord Admin
async function sendAdminLog(description: string) {
  try {
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [
        {
          title: '🤖 Cron Job Match Notifier',
          description,
          color: 3447003,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    console.error('Gagal kirim log ke Discord Admin:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Kalkulasi Waktu WIB (UTC+7)
    const now = new Date();
    const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const hours = wibDate.getUTCHours();
    const minutes = wibDate.getUTCMinutes();

    const matchData = TESTER_MATCH_DATA;
    const kvKey = `reminders:checkpoint:${matchData.matchId}`;
    const sentCheckpoints: string[] = (await kv.smembers(kvKey)) || [];

    // --- LOGIKA 1: JAM 18.00 WIB (REMINDER 1) ---
    if (hours === 18 && !sentCheckpoints.includes('reminder_1')) {
      const payloadA = buildReminderEmbed(matchData.teamA.nama, matchData.teamA.roleId, matchData.matchTimeWIB, matchData.wasit.mention);
      const payloadB = buildReminderEmbed(matchData.teamB.nama, matchData.teamB.roleId, matchData.matchTimeWIB, matchData.wasit.mention);

      const [resA, resB]: any = await Promise.all([
        discordAPI(`/channels/${matchData.teamA.channelId}/messages`, 'POST', payloadA),
        discordAPI(`/channels/${matchData.teamB.channelId}/messages`, 'POST', payloadB),
      ]);

      const msgIdsToSave: Record<string, string> = {};
      if (resA?.id) msgIdsToSave.teamA_rem1 = resA.id;
      if (resB?.id) msgIdsToSave.teamB_rem1 = resB.id;

      if (Object.keys(msgIdsToSave).length > 0) {
        await kv.hset(`msg:${matchData.matchId}`, msgIdsToSave);
      }

      await kv.sadd(kvKey, 'reminder_1');
      await sendAdminLog(`✅ **Reminder 1 (18.00 WIB)** berhasil dikirim ke channel tim ${matchData.teamA.nama} & ${matchData.teamB.nama}`);

      return NextResponse.json({ success: true, step: 'reminder_1_sent' });
    }

    // --- LOGIKA 2: JAM 19.00 WIB (REMINDER 2 + AUTO DELETE REMINDER 1) ---
    if (hours === 19 && minutes < 45 && !sentCheckpoints.includes('reminder_2')) {
      const oldMsgs: any = await kv.hgetall(`msg:${matchData.matchId}`);
      await Promise.all([
        deleteDiscordMessage(matchData.teamA.channelId, oldMsgs?.teamA_rem1),
        deleteDiscordMessage(matchData.teamB.channelId, oldMsgs?.teamB_rem1),
      ]);

      const payloadA = buildReminderEmbed(matchData.teamA.nama, matchData.teamA.roleId, matchData.matchTimeWIB, matchData.wasit.mention);
      const payloadB = buildReminderEmbed(matchData.teamB.nama, matchData.teamB.roleId, matchData.matchTimeWIB, matchData.wasit.mention);

      await Promise.all([
        discordAPI(`/channels/${matchData.teamA.channelId}/messages`, 'POST', payloadA),
        discordAPI(`/channels/${matchData.teamB.channelId}/messages`, 'POST', payloadB),
      ]);

      await kv.sadd(kvKey, 'reminder_2');
      await sendAdminLog(`✅ **Reminder 2 (19.00 WIB)** berhasil dikirim & **Reminder 1 lama telah dihapus**.`);

      return NextResponse.json({ success: true, step: 'reminder_2_sent' });
    }

    // --- LOGIKA 3: JAM 19.45 WIB (PREPARE BRIEFING + PANEL TIMER INTERAKTIF) ---
    if (hours === 19 && minutes >= 45 && !sentCheckpoints.includes('prepare')) {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      const preparePayload = buildPrepareEmbed();
      const timerPayload = createTimerControlEmbed(
        {
          teamA: { nama: matchData.teamA.nama, state: matchData.teamA },
          teamB: { nama: matchData.teamB.nama, state: matchData.teamB },
        },
        nowInSeconds
      );

      await discordAPI(`/channels/${matchData.matchChannelId}/messages`, 'POST', preparePayload);
      await discordAPI(`/channels/${matchData.matchChannelId}/messages`, 'POST', timerPayload);

      await kv.sadd(kvKey, 'prepare');
      await sendAdminLog(`🚀 **Prepare Briefing & Panel Timer (19.45 WIB)** berhasil dikirim ke Channel Match (${matchData.matchChannelId})!`);

      return NextResponse.json({ success: true, step: 'prepare_and_timer_sent' });
    }

    return NextResponse.json({
      success: true,
      message: 'Cron berjalan, tidak ada jadwal pengiriman pada menit/jam ini.',
      currentWibTime: `${hours}:${minutes < 10 ? '0' : ''}${minutes}`,
      sentCheckpoints,
    });

  } catch (error: any) {
    console.error('Error Match Notifier Cron:', error);
    await sendAdminLog(`❌ **Error Match Notifier Cron:** \`${error.message}\``);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
