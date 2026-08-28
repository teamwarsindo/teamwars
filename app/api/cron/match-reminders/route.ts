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
  checkDiscordMessageExists,
  DeckSubmissionStore,
} from '@/lib/discord/messages/match-briefing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const cronSecret = searchParams.get('secret') || authHeader?.replace('Bearer ', '');
    const isForce = searchParams.get('force') === 'true';
    const targetType = searchParams.get('type'); // 'camp' | 'match' | null

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized Cron Request' }, { status: 401 });
    }

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

    // Filter jadwal yang bertanding HARI INI
    const todayMatches = schedules.filter((m) => {
      if ((m as any).isFinished || !m.matchDate) return false;
      return getWibDateKey(new Date(m.matchDate)) === todayWibKey;
    });

    if (todayMatches.length === 0) {
      return NextResponse.json({
        success: true,
        currentWibHour,
        executedAt: now.toISOString(),
        logs: ['Tidak ada pertandingan yang dijadwalkan hari ini.'],
      });
    }

    for (let i = 0; i < schedules.length; i++) {
      const match = schedules[i];
      if ((match as any).isFinished || !match.matchDate) continue;

      const matchDate = new Date(match.matchDate);
      const matchWibKey = getWibDateKey(matchDate);

      // 🔒 KUNCI MUTLAK: Hanya proses match yang tanggalnya HARI INI
      if (matchWibKey !== todayWibKey) continue;

      const diffMs = matchDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);
      const teamAData = await kv.hgetall<any>(`teams:${slugA}`);
      const teamBData = await kv.hgetall<any>(`teams:${slugB}`);

      // Ambil ID Role Discord Resmi dari data tim
      const roleAId = teamAData?.roleId || teamAData?.discordRoleId || (match as any).roleAId;
      const roleBId = teamBData?.roleId || teamBData?.discordRoleId || (match as any).roleBId;
      const roleAPing = roleAId ? `<@&${roleAId}>` : `**${match.teamAName}**`;
      const roleBPing = roleBId ? `<@&${roleBId}>` : `**${match.teamBName}**`;
      const refPing = match.refereeDiscordId ? `<@${match.refereeDiscordId}>` : match.referee || 'Wasit Bertugas';

      // 🟡 1. PENGUMUMAN PAGI & TRACKER CAMP
      const shouldRunMorning =
        targetType === 'camp'
          ? true
          : targetType === 'match'
          ? false
          : isEightAmWindow || isForce;

      if (shouldRunMorning) {
        const deadlineIso = new Date(matchDate.getTime() - 60 * 60 * 1000).toISOString();
        const matchTimeWib = formatWIBTimeOnly(match.matchDate);
        const deadlineWib = formatWIBTimeOnly(deadlineIso);
        const timeRemainingStr = formatTimeRemaining(deadlineIso);
        const morningEmbed = getMorningCampEmbed({ deadlineWib, timeRemainingStr });

        // --- PROSES CAMP A ---
        const chA = teamAData?.channelCampId || teamAData?.discordChannelId || teamAData?.channelId;
        if (chA) {
          const storeAKey = `match:decks:${slugA}`;
          const storeA = (await kv.get<DeckSubmissionStore>(storeAKey)) || {
            matchId: match.id,
            teamSlug: slugA,
            submittedPlayers: [],
            totalDecks: 0,
          };

          const morningMsgExists = await checkDiscordMessageExists(chA, storeA.morningMsgId);

          if (!morningMsgExists) {
            const morningRes: any = await discordAPI(`/channels/${chA}/messages`, 'POST', {
              content: `⏳ ${roleAPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
              embeds: [morningEmbed],
            }).catch(() => null);

            const trackerAId = await sendOrUpdateLiveTracker({
              channelId: chA,
              matchDateIso: match.matchDate,
              submittedPlayers: storeA.submittedPlayers || [],
              existingMsgId: storeA.lastTrackerMessageId,
            });

            storeA.morningMsgId = morningRes?.id || null;
            storeA.lastTrackerMessageId = trackerAId;
            await kv.set(storeAKey, storeA);
            logs.push(`[CAMP SENT] Pengumuman dikirim ke camp ${match.teamAName}`);
          } else {
            logs.push(`[CAMP SKIP] Pesan di camp ${match.teamAName} masih aktif.`);
          }
        }

        // --- PROSES CAMP B ---
        const chB = teamBData?.channelCampId || teamBData?.discordChannelId || teamBData?.channelId;
        if (chB) {
          const storeBKey = `match:decks:${slugB}`;
          const storeB = (await kv.get<DeckSubmissionStore>(storeBKey)) || {
            matchId: match.id,
            teamSlug: slugB,
            submittedPlayers: [],
            totalDecks: 0,
          };

          const morningMsgExists = await checkDiscordMessageExists(chB, storeB.morningMsgId);

          if (!morningMsgExists) {
            const morningRes: any = await discordAPI(`/channels/${chB}/messages`, 'POST', {
              content: `⏳ ${roleBPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
              embeds: [morningEmbed],
            }).catch(() => null);

            const trackerBId = await sendOrUpdateLiveTracker({
              channelId: chB,
              matchDateIso: match.matchDate,
              submittedPlayers: storeB.submittedPlayers || [],
              existingMsgId: storeB.lastTrackerMessageId,
            });

            storeB.morningMsgId = morningRes?.id || null;
            storeB.lastTrackerMessageId = trackerBId;
            await kv.set(storeBKey, storeB);
            logs.push(`[CAMP SENT] Pengumuman dikirim ke camp ${match.teamBName}`);
          } else {
            logs.push(`[CAMP SKIP] Pesan di camp ${match.teamBName} masih aktif.`);
          }
        }

        (schedules[i] as any).campMorningSent = true;
        stateChanged = true;
      }

      // ⚔️ 2. MATCH BRIEFING (H-30 MENIT DI CHANNEL MATCH)
      const shouldRunBriefing =
        targetType === 'match'
          ? true
          : targetType === 'camp'
          ? false
          : (diffMinutes <= 30 && diffMinutes >= -10) || (isForce && targetType === 'match');

      if (shouldRunBriefing && match.discordChannelId) {
        const briefingMsgId = (match as any).briefingMsgId;
        const briefingExists = await checkDiscordMessageExists(match.discordChannelId, briefingMsgId);

        if (!briefingExists) {
          const briefingEmbed = getMatchBriefingEmbed();
          const briefingRes: any = await discordAPI(`/channels/${match.discordChannelId}/messages`, 'POST', {
            content: `📢 ${roleAPing} vs ${roleBPing} — Pertandingan segera dimulai di bawah kendali Wasit ${refPing}!`,
            embeds: [briefingEmbed],
          }).catch(() => null);

          (schedules[i] as any).briefingMsgId = briefingRes?.id || null;
          (schedules[i] as any).matchBriefingSent = true;
          stateChanged = true;
          logs.push(`[BRIEFING SENT] Match ${match.id} ke channel ${match.discordChannelId}`);
        } else {
          logs.push(`[BRIEFING SKIP] Briefing di channel ${match.discordChannelId} masih aktif.`);
        }
      }
    }

    if (stateChanged) {
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      currentWibHour,
      executedAt: now.toISOString(),
      logs: logs.length > 0 ? logs : ['Tidak ada antrian pesan yang perlu diproses pada interval ini.'],
    });
  } catch (error: any) {
    console.error('[CRON ERROR] Match Reminders Failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}