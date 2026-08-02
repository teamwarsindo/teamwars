import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { calculateStandings } from '@/lib/tournament/calculator';

const KV_KEY_SCHEDULES = 'twi:schedules';
const KV_KEY_ROULETTE = 'twi:roulette_state';

export async function GET() {
  try {
    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};

    const rawGroupA = rouletteState.groupA || [];
    const rawGroupB = rouletteState.groupB || [];

    const groupA = rawGroupA.map((t: any) => ({ ...t, groupName: 'Group A' }));
    const groupB = rawGroupB.map((t: any) => ({ ...t, groupName: 'Group B' }));

    // Regenerasi jika kosong atau belum terpetakan Group B
    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateDefaultSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    const masterTeams = [...groupA, ...groupB];
    const standings = calculateStandings(schedules, masterTeams);

    return NextResponse.json({
      schedules,
      standings,
      groupA,
      groupB,
      masterTeams,
    });
  } catch (error) {
    console.error('Error GET Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, matchId, matchDate, scoreA, scoreB, referee, streamer, rosterA, rosterB, gameLogs } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    if (action === 'UPDATE_MATCH') {
      schedules = schedules.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            matchDate: matchDate ?? match.matchDate,
            scoreA: scoreA ?? match.scoreA,
            scoreB: scoreB ?? match.scoreB,
            referee: referee ?? match.referee,
            streamer: streamer ?? match.streamer,
            isFinished: (scoreA >= 10 || scoreB >= 10),
          };
        }
        return match;
      });
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    if (action === 'RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: 'Group A' }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: 'Group B' }));
      schedules = generateDefaultSchedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('Error POST Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * Generator Jadwal Presisi:
 * Mulai Minggu 3 Agustus 2026.
 * Match dimainkan Rabu, Kamis, Jumat, Sabtu (2 Match/Hari @ 20:00 & 21:30 WIB)
 */
function generateDefaultSchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  const matchesA: { pair: [any, any]; groupName: "Group A" | "Group B" }[] = [];
  for (let i = 0; i < groupA.length; i++) {
    for (let j = i + 1; j < groupA.length; j++) {
      matchesA.push({ pair: [groupA[i], groupA[j]], groupName: "Group A" });
    }
  }

  const matchesB: { pair: [any, any]; groupName: "Group A" | "Group B" }[] = [];
  for (let i = 0; i < groupB.length; i++) {
    for (let j = i + 1; j < groupB.length; j++) {
      matchesB.push({ pair: [groupB[i], groupB[j]], groupName: "Group B" });
    }
  }

  // Interleave / Gabungkan bergantian A & B
  const allMatches = [];
  const max = Math.max(matchesA.length, matchesB.length);
  for (let i = 0; i < max; i++) {
    if (i < matchesA.length) allMatches.push(matchesA[i]);
    if (i < matchesB.length) allMatches.push(matchesB[i]);
  }

  // Mulai dari Senin 3 Agustus 2026
  let currentDate = new Date("2026-08-03T20:00:00+07:00");
  let dailyCount = 0;

  allMatches.forEach((m) => {
    // Cari hari Rabu (3), Kamis (4), Jumat (5), atau Sabtu (6)
    while (![3, 4, 5, 6].includes(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const matchTime = new Date(currentDate);
    if (dailyCount === 1) {
      matchTime.setHours(21, 30, 0, 0); // Slot 2
    } else {
      matchTime.setHours(20, 0, 0, 0);  // Slot 1
    }

    schedules.push({
      id: `match-${idCounter++}`,
      matchDate: matchTime.toISOString(),
      stage: "GROUP_STAGE",
      groupName: m.groupName,
      teamAId: m.pair[0].name,
      teamAName: m.pair[0].name,
      teamALogo: m.pair[0].logo || "/logo.webp",
      teamBId: m.pair[1].name,
      teamBName: m.pair[1].name,
      teamBLogo: m.pair[1].logo || "/logo.webp",
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      referee: "vG®D WHY",
      streamer: "Alroy_Yuan",
    });

    dailyCount++;
    if (dailyCount >= 2) {
      dailyCount = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return schedules;
}
  
