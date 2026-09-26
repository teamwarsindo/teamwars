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
    // 1. Ambil seluruh data sumber
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const oldActiveCampMap = (await kv.hgetall<Record<string, any>>('twi:active_camp_channels')) || {};
    const existingMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};

    const migratedMessages: Record<string, any> = {};
    const keysToDelete: string[] = [];
    let scheduleCleanedCount = 0;
    let oldMatchesUpdated = 0;

    // Patokan batas waktu saat ini (WIB / UTC)
    const now = new Date();

    // Cache tim master untuk mencegah fetch KV berulang
    const teamsCache: Record<string, any> = {};
    async function getTeamData(slug: string) {
      if (!slug) return null;
      if (teamsCache[slug] !== undefined) return teamsCache[slug];
      try {
        const data = await kv.get<any>(`teams:${slug}`);
        teamsCache[slug] = data || null;
        return data;
      } catch {
        teamsCache[slug] = null;
        return null;
      }
    }

    // Index pembantu dari active_camp_channels lama bila ada
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

    // 2. Iterasi setiap match dalam jadwal
    for (const match of schedules) {
      const matchId = match.id;
      if (!matchId) continue;

      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);
      const matchWeek = (match as any).weekNumber || getMatchWeekNumber(match.matchDate);

      // Cek apakah match sudah lewat atau belum jalan
      const matchTime = new Date(match.matchDate);
      const isUpcoming = matchTime >= now && !match.isFinished;

      // STRATEGI 1: Match yang BELUM JALAN -> Hapus dari KV discord:match_messages
      if (isUpcoming) {
        keysToDelete.push(matchId);
      } else {
        // STRATEGI 2: Match LAMA / SELESAI -> Pertahankan & Isi channelId dari master tim jika null
        let rawMsg = existingMessages[matchId];
        let msgObj: any = {};
        if (typeof rawMsg === 'string') {
          try { msgObj = JSON.parse(rawMsg); } catch { msgObj = {}; }
        } else if (typeof rawMsg === 'object' && rawMsg !== null) {
          msgObj = rawMsg;
        }

        const legacyCampA = campInfoByMatchAndTeam[`${matchId}_teamA`] || {};
        const legacyCampB = campInfoByMatchAndTeam[`${matchId}_teamB`] || {};

        let chA = msgObj.campA?.channelId || legacyCampA.channelId || null;
        let chB = msgObj.campB?.channelId || legacyCampB.channelId || null;
        const chMatch = match.discordChannelId || msgObj.matchChannel?.channelId || null;

        // Jika channel camp masih null, ambil dari teams:[slug]
        if (!chA && slugA) {
          const teamA = await getTeamData(slugA);
          chA = teamA?.channelCampId || teamA?.discordChannelId || null;
        }
        if (!chB && slugB) {
          const teamB = await getTeamData(slugB);
          chB = teamB?.channelCampId || teamB?.discordChannelId || null;
        }

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

        const campMorningSent =
          msgObj.campMorningSent !== undefined
            ? Boolean(msgObj.campMorningSent)
            : Boolean((match as any).campMorningSent ?? true);

        const matchBriefingSent =
          msgObj.matchBriefingSent !== undefined
            ? Boolean(msgObj.matchBriefingSent)
            : Boolean((match as any).matchBriefingSent ?? true);

        const briefingMsgId =
          msgObj.matchChannel?.briefingMsgId ||
          (match as any).briefingMsgId ||
          null;

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

        oldMatchesUpdated++;
      }

      // 3. Bersihkan flag bot dari twi:schedules
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

    // 4. Eksekusi KV Updates
    // A. Simpan data match lama yang channel-nya sudah diselaraskan
    if (Object.keys(migratedMessages).length > 0) {
      await kv.hset('discord:match_messages', migratedMessages);
    }

    // B. Hapus key match yang belum jalan agar dibuat fresh oleh cronjob
    if (keysToDelete.length > 0) {
      await kv.hdel('discord:match_messages', ...keysToDelete);
    }

    // C. Simpan jadwal yang sudah bersih
    if (scheduleCleanedCount > 0) {
      await kv.set('twi:schedules', schedules);
    }

    // D. Hapus key legacy
    await kv.del('twi:active_camp_channels');

    return NextResponse.json({
      success: true,
      message: 'Migrasi & pembersihan data berhasil dijalankan.',
      summary: {
        oldMatchesMigratedAndSynced: oldMatchesUpdated,
        upcomingMatchesDeleted: keysToDelete.length,
        deletedMatchIds: keysToDelete,
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
