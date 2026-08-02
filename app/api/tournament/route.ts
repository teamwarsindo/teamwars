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

    const groupA = rouletteState.groupA || [];
    const groupB = rouletteState.groupB || [];

    // Jika jadwal kosong atau tombol reset dipencet, regenerasi jadwal dengan penanggalan pasti
    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateDefaultSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    // Pastikan masterTeams memuat groupName asli tiap tim
    const groupATeams = groupA.map((t: any) => ({ ...t, groupName: 'Group A' }));
    const groupBTeams = groupB.map((t: any) => ({ ...t, groupName: 'Group B' }));
    const masterTeams = [...groupATeams, ...groupBTeams];

    const standings = calculateStandings(schedules, masterTeams);

    return NextResponse.json({
      schedules,
      standings,
      groupA: groupATeams,
      groupB: groupBTeams,
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
    const { action, matchId, matchDate, scoreA, scoreB, referee, streamer, caster, streamLink, rosterA, rosterB, gameLogs } = body;

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
            caster: caster ?? match.caster,
            streamLink: streamLink ?? match.streamLink,
            isFinished: (scoreA >= 10 || scoreB >= 10),
          };
        }
        return match;
      });
    }

    if (action === 'REGENERATE_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      schedules = generateDefaultSchedules(rouletteState.groupA || [], rouletteState.groupB || []);
    }

    await kv.set(KV_KEY_SCHEDULES, schedules);
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('Error POST Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * Generator Jadwal 8 Match/Minggu
 * Masing-masing 2 Match per hari (Rabu, Kamis, Jumat, Sabtu) jam 20.00 & 21.30 WIB
 * Diisi secara bergantian adil untuk Group A & Group B
 */
function generateDefaultSchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  // Pasangan Match Group A & B
  const rawGroupAMatches: [any, any][] = [];
  for (let i = 0; i < groupA.length; i++) {
    for (let j = i + 1; j < groupA.length; j++) {
      rawGroupAMatches.push([groupA[i], groupA[j]]);
    }
  }

  const rawGroupBMatches: [any, any][] = [];
  for (let i = 0; i < groupB.length; i++) {
    for (let j = i + 1; j < groupB.length; j++) {
      rawGroupBMatches.push([groupB[i], groupB[j]]);
    }
  }

  // Gabungkan pertandingan selang-seling Group A & Group B
  const allMatches: { pair: [any, any]; groupName: "Group A" | "Group B" }[] = [];
  const maxLen = Math.max(rawGroupAMatches.length, rawGroupBMatches.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < rawGroupAMatches.length) allMatches.push({ pair: rawGroupAMatches[i], groupName: "Group A" });
    if (i < rawGroupBMatches.length) allMatches.push({ pair: rawGroupBMatches[i], groupName: "Group B" });
  }

  // Mulai Tanggal: Senin 3 Agustus 2026 (Diatur match pertamanya pada Rabu 5 Ags / Senin 3 Ags)
  let currentDate = new Date("2026-08-03T20:00:00+07:00");
  let matchCountOnCurrentDay = 0;

  allMatches.forEach((item) => {
    // Lewati Minggu, Senin, Selasa -> Match hanya Rabu (3), Kamis (4), Jumat (5), Sabtu (6)
    while ([0, 1, 2].includes(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Jam match: Match 1 = 20:00 WIB, Match 2 = 21:30 WIB
    const matchTime = new Date(currentDate);
    if (matchCountOnCurrentDay === 1) {
      matchTime.setHours(21, 30, 0, 0);
    } else {
      matchTime.setHours(20, 0, 0, 0);
    }

    schedules.push({
      id: `match-${idCounter++}`,
      matchDate: matchTime.toISOString(),
      stage: "GROUP_STAGE",
      groupName: item.groupName,
      teamAId: item.pair[0].name,
      teamAName: item.pair[0].name,
      teamALogo: item.pair[0].logo || "/logo.webp",
      teamBId: item.pair[1].name,
      teamBName: item.pair[1].name,
      teamBLogo: item.pair[1].logo || "/logo.webp",
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      referee: "vG®D WHY",
      streamer: "Alroy_Yuan",
      caster: "Valdo",
      streamPlatform: "Youtube",
    });

    matchCountOnCurrentDay++;
    // 2 match per hari selesai, lanjut ke hari berikutnya
    if (matchCountOnCurrentDay >= 2) {
      matchCountOnCurrentDay = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return schedules;
}
  
