import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { calculateStandings } from '@/lib/tournament/calculator';

const KV_KEY_SCHEDULES = 'twi:schedules';
const KV_KEY_ROULETTE = 'twi:roulette_state';

// Helper untuk mengubah nama tim menjadi slug Redis
function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};

    const rawGroupA = rouletteState.groupA || [];
    const rawGroupB = rouletteState.groupB || [];

    const groupA = rawGroupA.map((t: any) => ({ ...t, groupName: 'Group A' }));
    const groupB = rawGroupB.map((t: any) => ({ ...t, groupName: 'Group B' }));

    // Auto-generate jika jadwal belum ada
    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateChallongeRoundRobinSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    // JIKA ADA REQUEST DETAIL MATCH TERTENTU (Untuk Match Input Console)
    if (matchId) {
      const match = schedules.find((m) => m.id === matchId);
      if (!match) {
        return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
      }

      // Ambil Data Roster Resmi dari Redis KV untuk Tim A & Tim B
      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);

      const [teamDataA, teamDataB] = await Promise.all([
        kv.hgetall(`teams:${slugA}`),
        kv.hgetall(`teams:${slugB}`),
      ]);

      const parsePlayers = (raw: any) => {
        if (!raw || !raw.players) return [];
        try {
          return typeof raw.players === 'string' ? JSON.parse(raw.players) : raw.players;
        } catch {
          return [];
        }
      };

      return NextResponse.json({
        match,
        dbRosterA: parsePlayers(teamDataA),
        dbRosterB: parsePlayers(teamDataB),
      });
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
    const { action, matchId, token, matchData } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    // 🟢 1. SYNC ROULETTE & RESET JADWAL
    if (action === 'SYNC_ROULETTE' || action === 'FORCE_RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: 'Group A' }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: 'Group B' }));

      schedules = generateChallongeRoundRobinSchedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
      return NextResponse.json({ success: true, schedules });
    }

    // 🟢 2. UPDATE MATCH DATA (HANYA JIKA TOKEN WASIT / ADMIN TS AQIF VALID)
    if (action === 'UPDATE_MATCH_CONSOLE') {
      const targetIndex = schedules.findIndex((m) => m.id === matchId);
      if (targetIndex === -1) {
        return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
      }

      const existingMatch = schedules[targetIndex];

      // Auth Check: Token Match atau Override Admin
      const isValidToken =
        token === 'tsaqif' ||
        (existingMatch.refereeToken && existingMatch.refereeToken === token);

      if (!isValidToken && existingMatch.refereeToken) {
        return NextResponse.json(
          { error: 'Akses ditolak. Token Wasit tidak valid!' },
          { status: 403 }
        );
      }

      // Hitung skor otomatis jika ada gameLogs
      const gameLogs = matchData.gameLogs || existingMatch.gameLogs || [];
      const scoreA = Math.min(10, gameLogs.filter((g: any) => g.winnerTeamId === existingMatch.teamAId).length);
      const scoreB = Math.min(10, gameLogs.filter((g: any) => g.winnerTeamId === existingMatch.teamBId).length);

      // Merge data pertandingan
      const updatedMatch: MatchScheduleItem = {
        ...existingMatch,
        ...matchData,
        scoreA: gameLogs.length > 0 ? scoreA : (matchData.scoreA ?? existingMatch.scoreA),
        scoreB: gameLogs.length > 0 ? scoreB : (matchData.scoreB ?? existingMatch.scoreB),
        gameLogs,
        isFinished: scoreA >= 10 || scoreB >= 10,
      };

      schedules[targetIndex] = updatedMatch;
      await kv.set(KV_KEY_SCHEDULES, schedules);

      return NextResponse.json({ success: true, updatedMatch });
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
  } catch (error) {
    console.error('Error POST Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateChallongeRoundRobinSchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  const generateRounds = (teams: any[]) => {
    const roundsList: [any, any][][] = [];
    const list = [...teams];
    if (list.length < 2) return roundsList;
    if (list.length % 2 !== 0) list.push({ name: "BYE", dummy: true });

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
  const totalRounds = Math.max(roundsA.length, roundsB.length);

  const startWednesdayUTC = new Date("2026-08-05T13:00:00.000Z");
  const startThursdayWeek1UTC = new Date("2026-08-06T13:00:00.000Z");

  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesA = roundsA[r] || [];
    const roundMatchesB = roundsB[r] || [];

    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      let matchDate: Date;
      if (r === 0) {
        matchDate = new Date(startThursdayWeek1UTC);
        matchDate.setDate(matchDate.getDate() + dayOffset);
      } else {
        matchDate = new Date(startWednesdayUTC);
        matchDate.setDate(matchDate.getDate() + (r * 7) + dayOffset);
      }

      if (dayOffset < roundMatchesA.length) {
        const pairA = roundMatchesA[dayOffset];
        const mId = `match-${idCounter++}`;
        schedules.push({
          id: mId,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group A",
          teamAId: pairA[0].name,
          teamAName: pairA[0].name,
          teamALogo: pairA[0].logo || "/logo.webp",
          teamBId: pairB ? pairA[1].name : pairA[1].name,
          teamBName: pairA[1].name,
          teamBLogo: pairA[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "vG®D WHY",
          refereeToken: `REF-${mId.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, // Auto Token per Match
          streamer: "Alroy_Yuan",
        });
      }

      if (dayOffset < roundMatchesB.length) {
        const pairB = roundMatchesB[dayOffset];
        const mId = `match-${idCounter++}`;
        schedules.push({
          id: mId,
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
          referee: "vG®D WHY",
          refereeToken: `REF-${mId.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, // Auto Token per Match
          streamer: "Alroy_Yuan",
        });
      }
    }
  }

  return schedules;
}
