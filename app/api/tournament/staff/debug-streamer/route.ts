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
  streamLink?: string;
  isFinished?: boolean;
  weekNumber?: number;
  teamAName?: string;
  teamBName?: string;
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

    const staffByName = new Map<string, StreamerStaff>();
    const staffNameSet = new Set<string>();

    staffList.forEach((s) => {
      const normalized = (s.discordName || '').trim().toLowerCase();
      if (normalized) {
        staffByName.set(normalized, s);
        staffNameSet.add(normalized);
      }
    });

    const schedulesWithStreamer = scheduleList.filter((m) => Boolean(m.streamer?.trim()));

    // 1. Nama streamer di jadwal yang tidak ada di roster staff:streamers
    const missingInStaffMap = new Map<string, { streamerName: string; matches: string[] }>();

    schedulesWithStreamer.forEach((m) => {
      const rawName = (m.streamer || '').trim();
      const normalized = rawName.toLowerCase();

      if (!staffNameSet.has(normalized)) {
        const existing = missingInStaffMap.get(normalized) || { streamerName: rawName, matches: [] };
        existing.matches.push(m.id);
        missingInStaffMap.set(normalized, existing);
      }
    });

    // 2. Ketidakcocokan antara historyMatch di staff vs jadwal
    const historyMismatches: Array<{
      discordName: string;
      discordId: string;
      missingFromHistory: string[];
      orphanInHistory: string[];
    }> = [];

    staffList.forEach((s) => {
      const normalized = (s.discordName || '').trim().toLowerCase();
      const expectedMatches = schedulesWithStreamer
        .filter((m) => (m.streamer || '').trim().toLowerCase() === normalized)
        .map((m) => m.id);

      const actualHistory = s.historyMatch || [];

      const missingFromHistory = expectedMatches.filter((id) => !actualHistory.includes(id));
      const orphanInHistory = actualHistory.filter((id) => !expectedMatches.includes(id));

      if (missingFromHistory.length > 0 || orphanInHistory.length > 0) {
        historyMismatches.push({
          discordName: s.discordName,
          discordId: s.discordId,
          missingFromHistory,
          orphanInHistory,
        });
      }
    });

    // 3. Streamer di roster yang sama sekali tidak punya match di jadwal
    const streamersWithZeroMatches = staffList
      .filter((s) => {
        const normalized = (s.discordName || '').trim().toLowerCase();
        return !schedulesWithStreamer.some((m) => (m.streamer || '').trim().toLowerCase() === normalized);
      })
      .map((s) => ({
        discordName: s.discordName,
        discordId: s.discordId,
        historyCountInStaff: (s.historyMatch || []).length,
      }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalStaffStreamers: staffList.length,
        totalSchedules: scheduleList.length,
        totalMatchesWithStreamer: schedulesWithStreamer.length,
        totalMissingNames: missingInStaffMap.size,
        totalStaffWithHistoryMismatch: historyMismatches.length,
        totalStreamersWithZeroMatches: streamersWithZeroMatches.length,
      },
      auditDetails: {
        missingInStaffStreamers: Array.from(missingInStaffMap.values()),
        historyMismatches,
        streamersWithZeroMatches,
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
