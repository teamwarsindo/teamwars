import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getTeamSlug,
  getMatchWeekNumber,
} from '@/app/tournament/_library';

export const dynamic = 'force-dynamic';

async function handleMigration() {
  try {
    // 1. Ambil seluruh data yang terlibat
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const oldActiveCampMap = (await kv.hgetall<Record<string, any>>('twi:active_camp_channels')) || {};
    const existingMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};

    const migratedMessages: Record<string, any> = {};
    let scheduleCleanedCount = 0;

    // Index pembantu dari active_camp_channels lama jika ada
    const campInfoByMatchAndTeam: Record<string, any> = {};
    for (const channelId in oldActiveCampMap) {
      let campData = oldActiveCampMap[channelId];
      if (typeof campData === 'string') {
        try { campData = JSON.parse(campData); } catch { continue; }
      }
      if (campData?.matchId && campData?.teamKey) {
        campInfoByMatchAndTeam[`${campData.matchId}_${campData.teamKey}`] = {
          ...campData,
          channelId,
        };
      }
    }

    // 2. Iterasi dan normalisasi setiap match
    for (const match of schedules) {
      const matchId = match.id;
      if (!matchId) continue;

      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);
      const matchWeek = (match as any).weekNumber || getMatchWeekNumber(match.matchDate);

      // Ambil data pesan yang sudah ada
      let rawMsg = existingMessages[matchId];
      let msgObj: any = {};
      if (typeof rawMsg === 'string') {
        try { msgObj = JSON.parse(rawMsg); } catch { msgObj = {}; }
      } else if (typeof rawMsg === 'object' && rawMsg !== null) {
        msgObj = rawMsg;
      }

      // Ambil referensi dari active_camp_channels lama bila msgObj belum lengkap
      const legacyCampA = campInfoByMatchAndTeam[`${matchId}_teamA`] || {};
      const legacyCampB = campInfoByMatchAndTeam[`${matchId}_teamB`] || {};

      // Resolusi Channel ID
      const chA = msgObj.campA?.channelId || legacyCampA.channelId || null;
      const chB = msgObj.campB?.channelId || legacyCampB.channelId || null;
      const chMatch = match.discordChannelId || msgObj.matchChannel?.channelId || null;

      // Resolusi activeMsgId (prioritaskan activeMsgId -> trackerMsgId -> submitMsgId)
      const activeMsgIdA =
        msgObj.campA?.activeMsgId ||
        msgObj.campA?.trackerMsgId ||
        msgObj.campA?.submitMsgId ||
        legacyCampA.submitMsgId ||
        null;

      const activeMsgIdB =
        msgObj.campB?.activeMsgId ||
        msgObj.campB?.trackerMsgId ||
        msgObj.campB?.submitMsgId ||
        legacyCampB.submitMsgId ||
        null;

      // Ambil status pengiriman
      const campMorningSent =
        msgObj.campMorningSent !== undefined
          ? Boolean(msgObj.campMorningSent)
          : Boolean((match as any).campMorningSent);

      const matchBriefingSent =
        msgObj.matchBriefingSent !== undefined
          ? Boolean(msgObj.matchBriefingSent)
          : Boolean((match as any).matchBriefingSent);

      const briefingMsgId =
        msgObj.matchChannel?.briefingMsgId ||
        (match as any).briefingMsgId ||
        null;

      // Bentuk struktur terpadu 1 sumber
      migratedMessages[matchId] = {
        matchId,
        week: matchWeek,
        matchDate: match.matchDate,
        campA: {
          teamKey: 'teamA',
          name: match.teamAName,
          slug: slugA,
          channelId: chA,
          morningMsgId: msgObj.campA?.morningMsgId || null,
          activeMsgId: activeMsgIdA,
        },
        campB: {
          teamKey: 'teamB',
          name: match.teamBName,
          slug: slugB,
          channelId: chB,
          morningMsgId: msgObj.campB?.morningMsgId || null,
          activeMsgId: activeMsgIdB,
        },
        matchChannel: {
          channelId: chMatch,
          briefingMsgId,
          lastReportMsgId: msgObj.matchChannel?.lastReportMsgId || null,
        },
        campMorningSent,
        matchBriefingSent,
      };

      // 3. Bersihkan sisa flag dari twi:schedules
      let matchModified = false;
      if ('campMorningSent' in match) {
        delete (match as any).campMorningSent;
        matchModified = true;
      }
      if ('matchBriefingSent' in match) {
        delete (match as any).matchBriefingSent;
        matchModified = true;
      }
      if ('briefingMsgId' in match) {
        delete (match as any).briefingMsgId;
        matchModified = true;
      }
      if (matchModified) {
        scheduleCleanedCount++;
      }
    }

    // 4. Eksekusi penyimpanan ke KV
    if (Object.keys(migratedMessages).length > 0) {
      await kv.hset('discord:match_messages', migratedMessages);
    }

    if (scheduleCleanedCount > 0) {
      await kv.set('twi:schedules', schedules);
    }

    await kv.del('twi:active_camp_channels');

    return NextResponse.json({
      success: true,
      message: 'Migrasi KV discord:match_messages berhasil diselesaikan.',
      summary: {
        totalMatchesMigrated: Object.keys(migratedMessages).length,
        schedulesCleaned: scheduleCleanedCount,
        deletedLegacyKey: 'twi:active_camp_channels',
      },
    });
  } catch (error: any) {
    console.error('[MIGRATION ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return handleMigration();
}

export async function POST() {
  return handleMigration();
        }
