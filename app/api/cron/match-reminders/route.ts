import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug, getWibDateKey } from '@/app/tournament/_library';
import { discordAPI } from '@/lib/discord/utils';
import {
  formatWIBTimeOnly,
  formatTimeRemaining,
  getMorningCampEmbed,
  getMatchBriefingEmbed,
  sendOrUpdateLiveTracker,
} from '@/lib/discord/messages/match-briefing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const cronSecret = searchParams.get('secret') || authHeader?.replace('Bearer ', '');
    const isForce = searchParams.get('force') === 'true';

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized Cron Request' }, { status: 401 });
    }

    // Ambil jam saat ini di zona WIB (Asia/Jakarta)
    const now = new Date();
    const currentWibHour = parseInt(
      now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false,
      }),
      10
    );

    const isEightAmWindow = currentWibHour === 8;
    const todayWibKey = getWibDateKey(now);
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    const logs: string[] = [];
    let stateChanged = false;

    for (let i = 0; i < schedules.length; i++) {
      const match = schedules[i];
      if ((match as any).isFinished || !match.matchDate) continue;

      const matchDate = new Date(match.matchDate);
      const matchWibKey = getWibDateKey(matchDate);
      const diffMs = matchDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);
      const teamAData = await kv.hgetall<any>(`teams:${slugA}`);
      const teamBData = await kv.hgetall<any>(`teams:${slugB}`);

      // 🟡 1. PENGUMUMAN PAGI (Hanya jika jam 08:xx WIB atau dipaksa via ?force=true)
      const shouldRunMorning = (isEightAmWindow || isForce) && (matchWibKey === todayWibKey || isForce);
      if (shouldRunMorning && (!(match as any).campMorningSent || isForce)) {
        const deadlineIso = new Date(matchDate.getTime() - 60 * 60 * 1000).toISOString();
        const matchTimeWib = formatWIBTimeOnly(match.matchDate);
        const deadlineWib = formatWIBTimeOnly(deadlineIso);
        const timeRemainingStr = formatTimeRemaining(deadlineIso);

        const morningEmbed = getMorningCampEmbed({ deadlineWib, timeRemainingStr });
        const refPing = match.refereeDiscordId ? `<@${match.refereeDiscordId}>` : match.referee || 'Wasit Bertugas';

        // Channel Camp A
        const chA = teamAData?.channelCampId || teamAData?.discordChannelId;
        if (chA) {
          const roleAPing = (match as any).roleAId ? `<@&${(match as any).roleAId}>` : `**${match.teamAName}**`;
          await discordAPI(`/channels/${chA}/messages`, 'POST', {
            content: `⏳ ${roleAPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
            embeds: [morningEmbed],
          }).catch(() => null);

          // Pasang Tracker Awal (0/10 Deck)
          const trackerAId = await sendOrUpdateLiveTracker({
            channelId: chA,
            matchDateIso: match.matchDate,
            submittedPlayers: [],
          });

          await kv.set(`match:decks:${slugA}`, {
            matchId: match.id,
            teamSlug: slugA,
            submittedPlayers: [],
            totalDecks: 0,
            lastTrackerMessageId: trackerAId,
          });
        }

        // Channel Camp B
        const chB = teamBData?.channelCampId || teamBData?.discordChannelId;
        if (chB) {
          const roleBPing = (match as any).roleBId ? `<@&${(match as any).roleBId}>` : `**${match.teamBName}**`;
          await discordAPI(`/channels/${chB}/messages`, 'POST', {
            content: `⏳ ${roleBPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
            embeds: [morningEmbed],
          }).catch(() => null);

          // Pasang Tracker Awal (0/10 Deck)
          const trackerBId = await sendOrUpdateLiveTracker({
            channelId: chB,
            matchDateIso: match.matchDate,
            submittedPlayers: [],
          });

          await kv.set(`match:decks:${slugB}`, {
            matchId: match.id,
            teamSlug: slugB,
            submittedPlayers: [],
            totalDecks: 0,
            lastTrackerMessageId: trackerBId,
          });
        }

        (schedules[i] as any).campMorningSent = true;
        stateChanged = true;
        logs.push(`[MORNING SENT] ${match.id} (${match.teamAName} vs ${match.teamBName})`);
      }

      // ⚔️ 2. MATCH BRIEFING H-30 MENIT (0 <= diffMinutes <= 30 atau ?force=true)
      const shouldRunBriefing = (diffMinutes <= 30 && diffMinutes >= -10) || isForce;
      if (shouldRunBriefing && (!(match as any).matchBriefingSent || isForce) && match.discordChannelId) {
        const briefingEmbed = getMatchBriefingEmbed();
        const roleAPing = (match as any).roleAId ? `<@&${(match as any).roleAId}>` : `**${match.teamAName}**`;
        const roleBPing = (match as any).roleBId ? `<@&${(match as any).roleBId}>` : `**${match.teamBName}**`;
        const refPing = match.refereeDiscordId ? `<@${match.refereeDiscordId}>` : match.referee || 'Wasit Bertugas';

        await discordAPI(`/channels/${match.discordChannelId}/messages`, 'POST', {
          content: `📢 ${roleAPing} vs ${roleBPing} — Pertandingan segera dimulai di bawah kendali Wasit ${refPing}!`,
          embeds: [briefingEmbed],
        }).catch(() => null);

        (schedules[i] as any).matchBriefingSent = true;
        stateChanged = true;
        logs.push(`[BRIEFING SENT] ${match.id} ke channel ${match.discordChannelId}`);
      }
    }

    if (stateChanged) {
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      currentWibHour,
      executedAt: now.toISOString(),
      logs: logs.length > 0 ? logs : ['No pending reminders to send at this interval.'],
    });
  } catch (error: any) {
    console.error('[CRON ERROR] Match Reminders Failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}