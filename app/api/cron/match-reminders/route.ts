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
  TrackerPlayer,
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

    // Ambil seluruh map pesan discord yang tersimpan
    const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};

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

      // Load data discord:match_messages & match:report untuk match ini
      let matchMsgData = matchMessages[match.id];
      if (typeof matchMsgData === 'string') {
        try {
          matchMsgData = JSON.parse(matchMsgData);
        } catch {
          matchMsgData = {};
        }
      }
      matchMsgData = matchMsgData || {
        campA: { channelId: null, slug: slugA, morningMsgId: null, trackerMsgId: null },
        campB: { channelId: null, slug: slugB, morningMsgId: null, trackerMsgId: null },
        matchChannel: { channelId: match.discordChannelId || null, briefingMsgId: null },
      };

      const reportData = (await kv.get<any>(`match:report:${match.id}`)) || {};
      let msgStateChanged = false;

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
          matchMsgData.campA = matchMsgData.campA || {};
          matchMsgData.campA.channelId = chA;
          matchMsgData.campA.slug = slugA;

          const morningMsgExists = await checkDiscordMessageExists(chA, matchMsgData.campA.morningMsgId);

          if (!morningMsgExists) {
            const morningRes: any = await discordAPI(`/channels/${chA}/messages`, 'POST', {
              content: `⏳ ${roleAPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
              embeds: [morningEmbed],
            }).catch(() => null);

            const lineupA: TrackerPlayer[] = (reportData.teamA?.lineup || []).map((p: any) => ({
              ign: p.ign || p.name,
            }));

            const trackerAId = await sendOrUpdateLiveTracker({
              channelId: chA,
              matchDateIso: match.matchDate,
              submittedPlayers: lineupA,
              existingMsgId: matchMsgData.campA.trackerMsgId,
            });

            matchMsgData.campA.morningMsgId = morningRes?.id || null;
            matchMsgData.campA.trackerMsgId = trackerAId;
            msgStateChanged = true;
            logs.push(`[CAMP SENT] Pengumuman dikirim ke camp ${match.teamAName}`);
          } else {
            logs.push(`[CAMP SKIP] Pesan di camp ${match.teamAName} masih aktif.`);
          }
        }

        // --- PROSES CAMP B ---
        const chB = teamBData?.channelCampId || teamBData?.discordChannelId || teamBData?.channelId;
        if (chB) {
          matchMsgData.campB = matchMsgData.campB || {};
          matchMsgData.campB.channelId = chB;
          matchMsgData.campB.slug = slugB;

          const morningMsgExists = await checkDiscordMessageExists(chB, matchMsgData.campB.morningMsgId);

          if (!morningMsgExists) {
            const morningRes: any = await discordAPI(`/channels/${chB}/messages`, 'POST', {
              content: `⏳ ${roleBPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
              embeds: [morningEmbed],
            }).catch(() => null);

            const lineupB: TrackerPlayer[] = (reportData.teamB?.lineup || []).map((p: any) => ({
              ign: p.ign || p.name,
            }));

            const trackerBId = await sendOrUpdateLiveTracker({
              channelId: chB,
              matchDateIso: match.matchDate,
              submittedPlayers: lineupB,
              existingMsgId: matchMsgData.campB.trackerMsgId,
            });

            matchMsgData.campB.morningMsgId = morningRes?.id || null;
            matchMsgData.campB.trackerMsgId = trackerBId;
            msgStateChanged = true;
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
        matchMsgData.matchChannel = matchMsgData.matchChannel || {};
        matchMsgData.matchChannel.channelId = match.discordChannelId;

        const briefingMsgId = matchMsgData.matchChannel.briefingMsgId || (match as any).briefingMsgId;
        const briefingExists = await checkDiscordMessageExists(match.discordChannelId, briefingMsgId);

        if (!briefingExists) {
          const briefingEmbed = getMatchBriefingEmbed();
          const briefingRes: any = await discordAPI(`/channels/${match.discordChannelId}/messages`, 'POST', {
            content: `📢 ${roleAPing} vs ${roleBPing} — Pertandingan segera dimulai di bawah kendali Wasit ${refPing}!`,
            embeds: [briefingEmbed],
          }).catch(() => null);

          matchMsgData.matchChannel.briefingMsgId = briefingRes?.id || null;
          (schedules[i] as any).briefingMsgId = briefingRes?.id || null;
          (schedules[i] as any).matchBriefingSent = true;
          msgStateChanged = true;
          stateChanged = true;
          logs.push(`[BRIEFING SENT] Match ${match.id} ke channel ${match.discordChannelId}`);
        } else {
          logs.push(`[BRIEFING SKIP] Briefing di channel ${match.discordChannelId} masih aktif.`);
        }
      }

      // Simpan perubahan data pesan discord untuk match ini
      if (msgStateChanged) {
        await kv.hset('discord:match_messages', { [match.id]: JSON.stringify(matchMsgData) });
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
