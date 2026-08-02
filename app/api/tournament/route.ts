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

    // Jika jadwal belum ada ATAU Group B belum terpetakan, regenerate jadwal default!
    const isInvalidSchedules = schedules.length === 0 || !schedules.some((s) => s.groupName === 'Group B');

    if (isInvalidSchedules) {
      schedules = generateChallongeRoundRobinSchedules(groupA, groupB);
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
    const { action, matchId, matchDate, scoreA, scoreB } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    if (action === 'FORCE_RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: 'Group A' }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: 'Group B' }));

      schedules = generateChallongeRoundRobinSchedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
      return NextResponse.json({ success: true, schedules });
    }

    if (action === 'UPDATE_MATCH') {
      schedules = schedules.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            matchDate: matchDate ?? match.matchDate,
            scoreA: scoreA ?? match.scoreA,
            scoreB: scoreB ?? match.scoreB,
            isFinished: scoreA >= 10 || scoreB >= 10,
          };
        }
        return match;
      });
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('Error POST Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * 🏆 GENERATOR ROUND-ROBIN CHALLONGE (1 MINGGU = 1 ROUND)
 * - 1 Round (Minggu) = 4 Match Group A + 4 Match Group B (Tepat 1x main per tim).
 * - Jadwal: Rabu, Kamis, Jumat, Sabtu (Masing-masing 1 Match Group A & 1 Match Group B @ 20:00 WIB).
 * - Menggunakan UTC String "13:00:00.000Z" yang setara dengan "20:00:00 WIB" agar pas di WIB.
 */
function generateChallongeRoundRobinSchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  // Algoritma Polygon untuk Pembagian Round-Robin Murni
  const generateRounds = (teams: any[]) => {
    const roundsList: [any, any][][] = [];
    const list = [...teams];
    if (list.length % 2 !== 0) list.push({ name: "BYE", dummy: true });

    const numRounds = list.length - 1;
    const half = list.length / 2;

    for (let r = 0; r < numRounds; r++) {
      const roundMatches: [any, any][] = [];
      for (let i = 0; i < half; i++) {
        const team1 = list[i];
        const team2 = list[list.length - 1 - i];
        if (!team1.dummy && !team2.dummy) {
          roundMatches.push([team1, team2]);
        }
      }
      roundsList.push(roundMatches);
      list.splice(1, 0, list.pop()!);
    }
    return roundsList;
  };

  const roundsA = generateRounds(groupA);
  const roundsB = generateRounds(groupB);
  const totalRounds = Math.max(roundsA.length, roundsB.length);

  // Tanggal Mulai: Rabu, 5 Agustus 2026 Jam 20:00 WIB (13:00 UTC)
  const startWednesdayUTC = new Date("2026-08-05T13:00:00.000Z");

  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesA = roundsA[r] || [];
    const roundMatchesB = roundsB[r] || [];

    // 4 Hari Tanding: Rabu (0), Kamis (1), Jumat (2), Sabtu (3)
    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const matchDate = new Date(startWednesdayUTC);
      matchDate.setDate(matchDate.getDate() + (r * 7) + dayOffset);

      // Match 1 Hari Ini: Group A (Jam 20:00 WIB)
      if (dayOffset < roundMatchesA.length) {
        const pairA = roundMatchesA[dayOffset];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group A",
          teamAId: pairA[0].name,
          teamAName: pairA[0].name,
          teamALogo: pairA[0].logo || "/logo.webp",
          teamBId: pairA[1].name,
          teamBName: pairA[1].name,
          teamBLogo: pairA[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "-",
          streamer: "-",
        });
      }

      // Match 2 Hari Ini: Group B (Jam 20:00 WIB)
      if (dayOffset < roundMatchesB.length) {
        const pairB = roundMatchesB[dayOffset];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group B",
          teamAId: pairB[0].name,
          teamAName: pairB[0].name,
          teamALogo: pairB[0].logo || "/logo.webp",
          teamBId: pairB[1].name,
          teamBName: pairB[1].name,
          teamBLogo: pairB[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "-",
          streamer: "-",
        });
      }
    }
  }

  return schedules;
}
