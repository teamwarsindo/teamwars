import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getTeamSlug,
  getWibDateKey,
  getMatchWeekNumber,
} from '@/app/tournament/_library';
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

    // Ambil seluruh map pesan discord yang tersimpan (Satu-satunya sumber kebenaran)
    const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
    const messagesToSave: Record<string, any> = {};

    for (let i = 0; i < schedules.length; i++) {
      const match = schedules[i];
      if ((match as any).isFinished || !match.matchDate) continue;

      const matchDate = new Date(match.matchDate);
      const matchWibKey = getWibDateKey(matchDate);

      // Hanya proses match yang tanggalnya HARI INI
      if (matchWibKey !== todayWibKey) continue;

      const diffMs = matchDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const matchWeek = (match as any).weekNumber || getMatchWeekNumber(match.matchDate);

      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);
      const teamAData = await kv.hgetall<any>(`teams:${slugA}`);
      const teamBData = await kv.hgetall<any>(`teams:${slugB}`);

      // ID Role Discord Resmi dari data tim
      const roleAId = teamAData?.roleId || teamAData?.discordRoleId || (match as any).roleAId;
      const roleBId = teamBData?.roleId || teamBData?.discordRoleId || (match as any).roleBId;
      const roleAPing = roleAId ? `<@&${roleAId}>` : `**${match.teamAName}**`;
      const roleBPing = roleBId ? `<@&${roleBId}>` : `**${match.teamBName}**`;
      const refPing = match.refereeDiscordId
        ? `<@${match.refereeDiscordId}>`
        : match.referee || 'Wasit Bertugas';

      // Parsing state tersimpan dari discord:match_messages
      let rawMsg = matchMessages[match.id];
      let matchMsgData: any = {};
      if (typeof rawMsg === 'string') {
        try {
          matchMsgData = JSON.parse(rawMsg);
        } catch {
          matchMsgData = {};
        }
      } else if (typeof rawMsg === 'object' && rawMsg !== null) {
        matchMsgData = rawMsg;
      }

      const campAChannel =
        teamAData?.channelCampId ||
        teamAData?.discordChannelId ||
        teamAData?.channelId ||
        matchMsgData.campA?.channelId ||
        null;

      const campBChannel =
        teamBData?.channelCampId ||
        teamBData?.discordChannelId ||
        teamBData?.channelId ||
        matchMsgData.campB?.channelId ||
        null;

      const currentMatchChannelId =
        match.discordChannelId || matchMsgData.matchChannel?.channelId || null;

      // Struktur terpadu 1 sumber
      const cleanMatchMsgData = {
        matchId: match.id,
        week: matchWeek,
        matchDate: match.matchDate,
        campA: {
          teamKey: 'teamA',
          name: match.teamAName,
          slug: slugA,
          channelId: campAChannel,
          morningMsgId: matchMsgData.campA?.morningMsgId || null,
          activeMsgId:
            matchMsgData.campA?.activeMsgId ||
            matchMsgData.campA?.submitMsgId ||
            matchMsgData.campA?.trackerMsgId ||
            null,
        },
        campB: {
          teamKey: 'teamB',
          name: match.teamBName,
          slug: slugB,
          channelId: campBChannel,
          morningMsgId: matchMsgData.campB?.morningMsgId || null,
          activeMsgId:
            matchMsgData.campB?.activeMsgId ||
            matchMsgData.campB?.submitMsgId ||
            matchMsgData.campB?.trackerMsgId ||
            null,
        },
        matchChannel: {
          channelId: currentMatchChannelId,
          briefingMsgId: matchMsgData.matchChannel?.briefingMsgId || null,
        },
        campMorningSent: Boolean(matchMsgData.campMorningSent),
        matchBriefingSent: Boolean(matchMsgData.matchBriefingSent),
      };

      const reportData = (await kv.hget<any>('twi:match_reports', match.id)) || {};
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
        const morningEmbed = getMorningCampEmbed({
          week: matchWeek,
          matchDateIso: match.matchDate,
          deadlineWib,
          timeRemainingStr,
        });

        // --- PROSES CAMP A ---
        if (cleanMatchMsgData.campA.channelId) {
          const chA = cleanMatchMsgData.campA.channelId;
          const morningMsgExists = await checkDiscordMessageExists(
            chA,
            cleanMatchMsgData.campA.morningMsgId
          );

          if (!morningMsgExists) {
            const morningRes: any = await discordAPI(`/channels/${chA}/messages`, 'POST', {
              content: `⏳ ${roleAPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
              embeds: [morningEmbed],
            }).catch(() => null);

            const lineupA: TrackerPlayer[] = (reportData.teamA?.lineup || []).map((p: any) => ({
              ign: p.ign || p.name,
              idDuelLinks: p.idDuelLinks || '',
              deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
              deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
            }));

            const trackerAId = await sendOrUpdateLiveTracker({
              channelId: chA,
              matchDateIso: match.matchDate,
              week: matchWeek,
              submittedPlayers: lineupA,
              existingMsgId: cleanMatchMsgData.campA.activeMsgId,
            });

            cleanMatchMsgData.campA.morningMsgId = morningRes?.id || null;
            cleanMatchMsgData.campA.activeMsgId = trackerAId;

            msgStateChanged = true;
            logs.push(`[CAMP SENT] Pengumuman dikirim ke camp ${match.teamAName}`);
          } else {
            logs.push(`[CAMP SKIP] Pesan di camp ${match.teamAName} masih aktif.`);
          }
        }

        // --- PROSES CAMP B ---
        if (cleanMatchMsgData.campB.channelId) {
          const chB = cleanMatchMsgData.campB.channelId;
          const morningMsgExists = await checkDiscordMessageExists(
            chB,
            cleanMatchMsgData.campB.morningMsgId
          );

          if (!morningMsgExists) {
            const morningRes: any = await discordAPI(`/channels/${chB}/messages`, 'POST', {
              content: `⏳ ${roleBPing} Pertandingan kalian dijadwalkan pukul **${matchTimeWib}** bersama Wasit ${refPing}.`,
              embeds: [morningEmbed],
            }).catch(() => null);

            const lineupB: TrackerPlayer[] = (reportData.teamB?.lineup || []).map((p: any) => ({
              ign: p.ign || p.name,
              idDuelLinks: p.idDuelLinks || '',
              deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
              deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
            }));

            const trackerBId = await sendOrUpdateLiveTracker({
              channelId: chB,
              matchDateIso: match.matchDate,
              week: matchWeek,
              submittedPlayers: lineupB,
              existingMsgId: cleanMatchMsgData.campB.activeMsgId,
            });

            cleanMatchMsgData.campB.morningMsgId = morningRes?.id || null;
            cleanMatchMsgData.campB.activeMsgId = trackerBId;

            msgStateChanged = true;
            logs.push(`[CAMP SENT] Pengumuman dikirim ke camp ${match.teamBName}`);
          } else {
            logs.push(`[CAMP SKIP] Pesan di camp ${match.teamBName} masih aktif.`);
          }
        }

        cleanMatchMsgData.campMorningSent = true;
      }

      // ⚔️ 2. MATCH BRIEFING (H-30 MENIT DI CHANNEL MATCH)
      const shouldRunBriefing =
        targetType === 'match'
          ? true
          : targetType === 'camp'
          ? false
          : (diffMinutes <= 30 && diffMinutes >= -10) || (isForce && targetType === 'match');

      if (shouldRunBriefing && cleanMatchMsgData.matchChannel.channelId) {
        const matchChannelId = cleanMatchMsgData.matchChannel.channelId;
        const briefingExists = await checkDiscordMessageExists(
          matchChannelId,
          cleanMatchMsgData.matchChannel.briefingMsgId
        );

        if (!briefingExists) {
          const briefingEmbed = getMatchBriefingEmbed();
          const briefingRes: any = await discordAPI(`/channels/${matchChannelId}/messages`, 'POST', {
            content: `📢 ${roleAPing} vs ${roleBPing} — Pertandingan segera dimulai di bawah kendali Wasit ${refPing}!`,
            embeds: [briefingEmbed],
          }).catch(() => null);

          cleanMatchMsgData.matchChannel.briefingMsgId = briefingRes?.id || null;
          cleanMatchMsgData.matchBriefingSent = true;

          msgStateChanged = true;
          logs.push(`[BRIEFING SENT] Match ${match.id} ke channel ${matchChannelId}`);
        } else {
          logs.push(`[BRIEFING SKIP] Briefing di channel ${matchChannelId} masih aktif.`);
        }
      }

      // Tandai perubahan untuk batch save
      if (msgStateChanged || !rawMsg) {
        messagesToSave[match.id] = cleanMatchMsgData;
      }
    }

    // Simpan semua state discord ke hash discord:match_messages
    if (Object.keys(messagesToSave).length > 0) {
      await kv.hset('discord:match_messages', messagesToSave);
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
