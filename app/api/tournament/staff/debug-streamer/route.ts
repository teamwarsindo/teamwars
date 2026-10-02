import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface StreamerStaff {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
  historyMatch?: string[];
  avatarUrl?: string;
}

interface ScheduleItem {
  id: string;
  streamer?: string;
  [key: string]: unknown;
}

export async function GET() {
  try {
    const [rawStaffStreamers, rawSchedules] = await Promise.all([
      redis.get<StreamerStaff[] | string>('staff:streamers'),
      redis.get<ScheduleItem[] | string>('twi:schedules'),
    ]);

    const staffList: StreamerStaff[] =
      typeof rawStaffStreamers === 'string'
        ? JSON.parse(rawStaffStreamers)
        : rawStaffStreamers || [];

    const scheduleList: ScheduleItem[] =
      typeof rawSchedules === 'string'
        ? JSON.parse(rawSchedules)
        : rawSchedules || [];

    const valdoMatches = ['match-3', 'match-6', 'match-38'];
    const finalBossMatches = [
      'match-9',
      'match-16',
      'match-17',
      'match-21',
      'match-28',
      'match-34',
      'match-54',
    ];

    // 1. Perbarui data Valdo di staff:streamers
    let valdoFound = false;
    staffList.forEach((st) => {
      const name = (st.discordName || '').trim().toLowerCase();
      if (name === 'valdomour' || name === 'valdomort' || name === 'valdo') {
        st.discordName = 'Valdo';
        const currentHistory = new Set(st.historyMatch || []);
        valdoMatches.forEach((mId) => currentHistory.add(mId));
        st.historyMatch = Array.from(currentHistory);
        valdoFound = true;
      }
    });

    if (!valdoFound) {
      staffList.push({
        discordId: '352866958414315532',
        discordName: 'Valdo',
        assignMatch: [],
        historyMatch: valdoMatches,
        avatarUrl: '',
      });
    }

    // 2. Tambahkan TheFinalBoss ke staff:streamers jika belum ada
    const existingFinalBoss = staffList.find(
      (st) => (st.discordName || '').trim().toLowerCase() === 'thefinalboss'
    );

    if (existingFinalBoss) {
      existingFinalBoss.discordId = existingFinalBoss.discordId || '';
      const currentHistory = new Set(existingFinalBoss.historyMatch || []);
      finalBossMatches.forEach((mId) => currentHistory.add(mId));
      existingFinalBoss.historyMatch = Array.from(currentHistory);
    } else {
      staffList.push({
        discordId: '',
        discordName: 'TheFinalBoss',
        assignMatch: [],
        historyMatch: finalBossMatches,
        avatarUrl: '',
      });
    }

    // 3. Perbarui nama streamer Valdo di twi:schedules
    let scheduleUpdatedCount = 0;
    scheduleList.forEach((m) => {
      const streamerName = (m.streamer || '').trim().toLowerCase();
      if (streamerName === 'valdomour' || streamerName === 'valdomort') {
        m.streamer = 'Valdo';
        scheduleUpdatedCount += 1;
      }
    });

    // 4. Simpan pembaruan kembali ke Redis
    await Promise.all([
      redis.set('staff:streamers', JSON.stringify(staffList)),
      redis.set('twi:schedules', JSON.stringify(scheduleList)),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Data streamer Valdo dan TheFinalBoss berhasil diperbarui.',
      updated: {
        valdoMatchesAdded: valdoMatches,
        theFinalBossMatchesAdded: finalBossMatches,
        schedulesUpdatedToValdo: scheduleUpdatedCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
        }
