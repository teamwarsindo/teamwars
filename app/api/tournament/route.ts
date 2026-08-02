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

    const hasGroupBInSchedules = schedules.some((s) => s.groupName === 'Group B');

    if (schedules.length === 0 || !hasGroupBInSchedules) {
      schedules = generatePerGroupWeeklySchedules(groupA, groupB);
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

      schedules = generatePerGroupWeeklySchedules(gA, gB);
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
 * 🎯 ALGORITMA PENJADWALAN PER-GRUP MINGGUAN:
 * - Setiap Minggu (Rabu, Kamis, Jumat, Sabtu):
 *   - 1 Match Group A @ 20:00 WIB
 *   - 1 Match Group B @ 20:00 WIB
 * - Menjamin dalam 1 Minggu SEMUA TIM di Group A & Group B main tepat 1x.
 */
function generatePerGroupWeeklySchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  // 1. Generate Pasangan Round-Robin Group A
  const pairsA: { pair: [any, any]; groupName: "Group A" }[] = [];
  for (let i = 0; i < groupA.length; i++) {
    for (let j = i + 1; j < groupA.length; j++) {
      pairsA.push({ pair: [groupA[i], groupA[j]], groupName: "Group A" });
    }
  }

  // 2. Generate Pasangan Round-Robin Group B
  const pairsB: { pair: [any, any]; groupName: "Group B" }[] = [];
  for (let i = 0; i < groupB.length; i++) {
    for (let j = i + 1; j < groupB.length; j++) {
      pairsB.push({ pair: [groupB[i], groupB[j]], groupName: "Group B" });
    }
  }

  // Tanggal Awal: Rabu, 5 Agustus 2026 jam 20:00 WIB
  let weekStartDate = new Date("2026-08-05T20:00:00+07:00");
  const maxWeeks = Math.max(pairsA.length, pairsB.length);

  // Hari pertandingan aktif per minggu: Rabu (3), Kamis (4), Jumat (5), Sabtu (6)
  const daysOffset = [0, 1, 2, 3]; 

  let indexA = 0;
  let indexB = 0;

  for (let week = 0; week < maxWeeks; week++) {
    for (let dayIdx = 0; dayIdx < 4; dayIdx++) {
      const matchDate = new Date(weekStartDate);
      matchDate.setDate(matchDate.getDate() + (week * 7) + daysOffset[dayIdx]);
      matchDate.setHours(20, 0, 0, 0); // SEMUA JAM 20:00 WIB

      // Match 1 Hari Ini: Group A
      if (indexA < pairsA.length) {
        const itemA = pairsA[indexA++];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group A",
          teamAId: itemA.pair[0].name,
          teamAName: itemA.pair[0].name,
          teamALogo: itemA.pair[0].logo || "/logo.webp",
          teamBId: itemA.pair[1].name,
          teamBName: itemA.pair[1].name,
          teamBLogo: itemA.pair[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "vG®D WHY",
          streamer: "Alroy_Yuan",
        });
      }

      // Match 2 Hari Ini: Group B
      if (indexB < pairsB.length) {
        const itemB = pairsB[indexB++];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group B",
          teamAId: itemB.pair[0].name,
          teamAName: itemB.pair[0].name,
          teamALogo: itemB.pair[0].logo || "/logo.webp",
          teamBId: itemB.pair[1].name,
          teamBName: itemB.pair[1].name,
          teamBLogo: itemB.pair[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "vG®D WHY",
          streamer: "Alroy_Yuan",
        });
      }
    }
  }

  return schedules;
        }
         
