import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { calculateStandings } from '@/lib/tournament/calculator';
import { hasAdminPermission } from '@/lib/auth-rbac';

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

    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateTWSeason7Schedules(groupA, groupB);
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
    const isAuthorized = await hasAdminPermission(['SUPER_ADMIN', 'MATCH_ADMIN']);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Admin Match / Super Admin.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, matchId, matchDate, scoreA, scoreB, report, updatedSchedules } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    if (action === 'SYNC_ROULETTE' || action === 'FORCE_RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: 'Group A' }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: 'Group B' }));

      schedules = generateTWSeason7Schedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
      return NextResponse.json({ success: true, schedules });
    }

    if (action === 'SAVE_FULL_SCHEDULES' && Array.isArray(updatedSchedules)) {
      await kv.set(KV_KEY_SCHEDULES, updatedSchedules);
      return NextResponse.json({ success: true, schedules: updatedSchedules });
    }

    if (action === 'UPDATE_MATCH') {
      schedules = schedules.map((match) => {
        if (match.id === matchId) {
          let calcScoreA = scoreA ?? match.scoreA;
          let calcScoreB = scoreB ?? match.scoreB;

          if (report && Array.isArray(report.games)) {
            calcScoreA = report.games.filter((g: any) => g.resultA === 'W').length;
            calcScoreB = report.games.filter((g: any) => g.resultB === 'W').length;
          }

          return {
            ...match,
            matchDate: matchDate ?? match.matchDate,
            scoreA: Math.min(10, calcScoreA),
            scoreB: Math.min(10, calcScoreB),
            isFinished: calcScoreA >= 10 || calcScoreB >= 10 || (report !== undefined && report !== null),
            report: report !== undefined ? report : match.report,
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
 * TWI SEASON 7 ROUND-ROBIN GENERATOR
 * - Week 1: Mulai 3 Ags 2026, Pertandingan Kamis - Minggu (6 - 9 Ags 2026), 1 Match Group A + 1 Match Group B per hari (20:00 WIB).
 * - Week 2 dst: Pertandingan Rabu - Sabtu (20:00 WIB), 1 Match Group A + 1 Match Group B per hari.
 */
function generateTWSeason7Schedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  const generateRounds = (teams: any[]) => {
    const roundsList: [any, any][][] = [];
    const list = [...teams];
    if (list.length < 2) return roundsList;
    if (list.length % 2 !== 0) list.push({ name: 'BYE', dummy: true });

    const numRounds = list.length - 1;
    const half = list.length / 2;

    for (let r = 0; r < numRounds; r++) {
      const roundMatches: [any, any][] = [];
      for (let i = 0; i < half; i++) {
        const team1 = list[i];
        const team2 = list[list.length - 1 - i];
        if (team1 && team2 && !team1.dummy && !team2.dummy) {
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
  const totalWeeks = Math.max(roundsA.length, roundsB.length);

  const baseWeek1Monday = new Date('2026-08-03T13:00:00.000Z'); // 20:00 WIB

  for (let w = 0; w < totalWeeks; w++) {
    const weekNumber = w + 1;
    const matchesA = roundsA[w] || [];
    const matchesB = roundsB[w] || [];

    const dayOffsets = weekNumber === 1 ? [3, 4, 5, 6] : [2, 3, 4, 5];
    const maxDaily = Math.max(matchesA.length, matchesB.length);

    for (let d = 0; d < maxDaily; d++) {
      const dayIndex = dayOffsets[d % dayOffsets.length];
      const matchDate = new Date(baseWeek1Monday);
      matchDate.setDate(matchDate.getDate() + w * 7 + dayIndex);

      if (d < matchesA.length) {
        const pairA = matchesA[d];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: 'GROUP_STAGE',
          groupName: 'Group A',
          weekNumber,
          teamAId: pairA[0].name,
          teamAName: pairA[0].name,
          teamALogo: pairA[0].logo || '/logo.webp',
          teamBId: pairA[1].name,
          teamBName: pairBNameOrFallback(pairA[1]),
          teamBLogo: pairA[1].logo || '/logo.webp',
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: 'vG®D WHY',
          streamer: 'Alroy_Yuan',
        });
      }

      if (d < matchesB.length) {
        const pairB = matchesB[d];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: 'GROUP_STAGE',
          groupName: 'Group B',
          weekNumber,
          teamAId: pairB[0].name,
          teamAName: pairB[0].name,
          teamALogo: pairB[0].logo || '/logo.webp',
          teamBId: pairB[1].name,
          teamBName: pairBNameOrFallback(pairB[1]),
          teamBLogo: pairB[1].logo || '/logo.webp',
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: 'vG®D WHY',
          streamer: 'Alroy_Yuan',
        });
      }
    }
  }

  return schedules;
}

function pairBNameOrFallback(teamObj: any): string {
  return teamObj?.name || 'BYE';
}
