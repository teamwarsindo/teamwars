import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, DIVISION_MAP } from '@/lib/types/tournament';
import { calculateStandings } from '@/lib/tournament/calculator';

const KV_KEY_SCHEDULES = 'twi:schedules';
const KV_KEY_ROULETTE = 'twi:roulette_state';

// Batas waktu berlaku token Wasit (7 hari dalam milidetik)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Helper verifikasi token & expiration 7 hari
function verifyAccess(match: MatchScheduleItem, token?: string) {
  const adminSecret = process.env.BASIC_AUTH_PWD || 'tsaqif';

  // Bypass Penuh Admin menggunakan BASIC_AUTH_PWD
  if (token && token === adminSecret) {
    return { valid: true, isAdmin: true, reason: 'ADMIN_BYPASS' };
  }

  // Cek kecocokan token Wasit
  if (!match.refereeToken || token !== match.refereeToken) {
    return { valid: false, isAdmin: false, reason: 'TOKEN_INVALID' };
  }

  // Cek batas waktu 7 hari sejak tanggal pertandingan
  const matchTime = new Date(match.matchDate).getTime();
  const now = Date.now();

  if (!isNaN(matchTime) && now - matchTime > SEVEN_DAYS_MS) {
    return { valid: false, isAdmin: false, reason: 'TOKEN_EXPIRED' };
  }

  return { valid: true, isAdmin: false, reason: 'REFEREE_VALID' };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');
    const token = searchParams.get('token') || undefined;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};

    const rawGroupA = rouletteState.groupA || [];
    const rawGroupB = rouletteState.groupB || [];

    const groupA = rawGroupA.map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A }));
    const groupB = rawGroupB.map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B }));

    // Auto-generate jika jadwal belum ada di KV
    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateChallongeRoundRobinSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    // HANDLER DETAIL MATCH CONSOLE & WASIT
    if (matchId) {
      const matchIndex = schedules.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) {
        return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
      }

      const match = schedules[matchIndex];

      // Auto-generate token wasit jika belum ada
      if (!match.refereeToken) {
        match.refereeToken = `REF-${match.id.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        schedules[matchIndex] = match;
        await kv.set(KV_KEY_SCHEDULES, schedules);
      }

      // Verifikasi otorisasi akses token
      const access = verifyAccess(match, token);
      if (!access.valid) {
        const errorMsg =
          access.reason === 'TOKEN_EXPIRED'
            ? 'Akses ditolak. Token Wasit sudah kadaluwarsa (lebih dari 7 hari).'
            : 'Akses ditolak. Token Wasit tidak valid!';
        return NextResponse.json({ error: errorMsg, accessReason: access.reason }, { status: 403 });
      }

      // Fetch Roster Resmi Tim dari KV
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
        success: true,
        match,
        dbRosterA: parsePlayers(teamDataA),
        dbRosterB: parsePlayers(teamDataB),
        isExpired: false,
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

    // 1. RESET / SYNC JADWAL
    if (action === 'SYNC_ROULETTE' || action === 'FORCE_RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B }));

      schedules = generateChallongeRoundRobinSchedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
      return NextResponse.json({ success: true, schedules });
    }

    // 2. UPDATE MATCH DATA (MATCH CONSOLE / ADMIN DASHBOARD)
    if (action === 'UPDATE_MATCH_CONSOLE') {
      const targetIndex = schedules.findIndex((m) => m.id === matchId);
      if (targetIndex === -1) {
        return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
      }

      const existingMatch = schedules[targetIndex];

      // Verifikasi token & bypass admin
      const access = verifyAccess(existingMatch, token);
      if (!access.valid) {
        const errorMsg =
          access.reason === 'TOKEN_EXPIRED'
            ? 'Akses ditolak. Token Wasit sudah kadaluwarsa (lebih dari 7 hari).'
            : 'Akses ditolak. Token Wasit tidak valid!';
        return NextResponse.json({ error: errorMsg }, { status: 403 });
      }

      // Gabungkan data match
      const updatedMatch: MatchScheduleItem = {
        ...existingMatch,
        ...matchData,
        // Skor utama tetap dipertahankan dari input admin/score sebelumnya
        scoreA: matchData.scoreA ?? existingMatch.scoreA ?? 0,
        scoreB: matchData.scoreB ?? existingMatch.scoreB ?? 0,
        isFinished: matchData.isFinished ?? existingMatch.isFinished ?? false,
      };

      delete (updatedMatch as any).isCompleted;

      schedules[targetIndex] = updatedMatch;
      await kv.set(KV_KEY_SCHEDULES, schedules);

      // Recalculate standings (murni berdasarkan scoreA & scoreB)
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const masterTeams = [
        ...(rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A })),
        ...(rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B })),
      ];
      const standings = calculateStandings(schedules, masterTeams);

      return NextResponse.json({ success: true, updatedMatch, standings });
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
  const totalRounds = Math.max(roundsA.length, roundsB.length);

  const startWednesdayUTC = new Date('2026-08-05T13:00:00.000Z');
  const startThursdayWeek1UTC = new Date('2026-08-06T13:00:00.000Z');

  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesA = roundsA[r] || [];
    const roundMatchesB = roundsB[r] || [];
    const weekNumber = r + 1;

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
          stage: 'GROUP_STAGE',
          groupName: DIVISION_MAP.GROUP_A,
          weekNumber,
          teamAId: pairA[0].name,
          teamAName: pairA[0].name,
          teamALogo: pairA[0].logo || '/logo.webp',
          teamBId: pairA[1].name,
          teamBName: pairA[1].name,
          teamBLogo: pairA[1].logo || '/logo.webp',
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: '',
          refereeToken: `REF-${mId.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          streamer: '',
        });
      }

      if (dayOffset < roundMatchesB.length) {
        const pairB = roundMatchesB[dayOffset];
        const mId = `match-${idCounter++}`;
        schedules.push({
          id: mId,
          matchDate: matchDate.toISOString(),
          stage: 'GROUP_STAGE',
          groupName: DIVISION_MAP.GROUP_B,
          weekNumber,
          teamAId: pairB[0].name,
          teamAName: pairB[0].name,
          teamALogo: pairB[0].logo || '/logo.webp',
          teamBId: pairB[1].name,
          teamBName: pairB[1].name,
          teamBLogo: pairB[1].logo || '/logo.webp',
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: '',
          refereeToken: `REF-${mId.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          streamer: '',
        });
      }
    }
  }

  return schedules;
}