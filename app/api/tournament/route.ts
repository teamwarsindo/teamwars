import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  MatchDetailsKV,
  GameDetailLog,
  DIVISION_MAP,
} from '@/lib/types/tournament';
import { calculateStandings } from '@/lib/tournament/calculator';

const KV_KEY_SCHEDULES = 'twi:schedules';
const KV_KEY_ROULETTE = 'twi:roulette_state';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function computeWeekNumber(dateIsoString?: string): number {
  if (!dateIsoString) return 1;
  const startDate = new Date('2026-08-03T00:00:00+07:00').getTime();
  const matchDate = new Date(dateIsoString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function verifyRefereeTokenOnly(match: MatchScheduleItem, token?: string) {
  if (!match.refereeToken || token !== match.refereeToken) {
    return { valid: false, reason: 'TOKEN_INVALID' };
  }

  const matchTime = new Date(match.matchDate).getTime();
  const now = Date.now();

  if (!isNaN(matchTime) && now - matchTime > SEVEN_DAYS_MS) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  return { valid: true, reason: 'REFEREE_VALID' };
}

// 🟢 GET: MENGAMBIL DATA JADWAL & DETAIL MATCH
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

    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateChallongeRoundRobinSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    // --- CASE 1: FETCH DETAIL KHUSUS SATU MATCH (MATCH CONSOLE & POP-UP) ---
    if (matchId) {
      const matchIndex = schedules.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) {
        return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
      }

      const match = schedules[matchIndex];

      // Generate Referee Token jika belum ada
      if (!match.refereeToken) {
        match.refereeToken = `REF-${match.id.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        schedules[matchIndex] = match;
        await kv.set(KV_KEY_SCHEDULES, schedules);
      }

      // Verifikasi Token Wasit
      const adminSecret = process.env.BASIC_AUTH_PWD || 'tsaqif';
      if (token && token !== adminSecret) {
        const access = verifyRefereeTokenOnly(match, token);
        if (!access.valid) {
          const errorMsg =
            access.reason === 'TOKEN_EXPIRED'
              ? 'Akses ditolak. Token Wasit sudah kadaluwarsa (lebih dari 7 hari).'
              : 'Akses ditolak. Token Wasit tidak valid!';
          return NextResponse.json({ error: errorMsg, accessReason: access.reason }, { status: 403 });
        }
      }

      // 1. Ambil detail match dari Key Terpisah (Arsitektur Baru)
      let matchDetails = await kv.get<MatchDetailsKV>(`twi:match_details:${matchId}`);

      // 2. FALLBACK STRATEGY (Untuk Data Match Lama)
      if (!matchDetails) {
        matchDetails = {
          matchId,
          lineupA: match.lineupA || [],
          lineupB: match.lineupB || [],
          gameLogs: match.gameLogs || [],
          referee: match.referee || '',
          refereeDiscordId: match.refereeDiscordId || '',
          streamer: match.streamer || '',
          streamerDiscordId: match.streamerDiscordId || '',
          streamLink: match.streamLink || '',
          rosterA: match.rosterA,
          rosterB: match.rosterB,
        };
      }

      // Ambil Roster DB Tim A & B
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

      // Gabungkan (Merge) data match dasar dengan matchDetails
      const mergedMatch = {
        ...match,
        ...matchDetails,
      };

      return NextResponse.json({
        success: true,
        match: mergedMatch,
        dbRosterA: parsePlayers(teamDataA),
        dbRosterB: parsePlayers(teamDataB),
        isExpired: false,
      });
    }

    // --- CASE 2: FETCH KLASEMEN & JADWAL UTAMA ---
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

// 🟢 POST: UPDATE MATCH CONSOLE (SIMPAN DETAIL TERPISAH & HITUNG SKOR/STANDINGS)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, matchId, matchData } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    if (action === 'SYNC_ROULETTE' || action === 'FORCE_RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B }));

      schedules = generateChallongeRoundRobinSchedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
      return NextResponse.json({ success: true, schedules });
    }

    if (action === 'UPDATE_MATCH_CONSOLE') {
      const targetIndex = schedules.findIndex((m) => m.id === matchId);
      if (targetIndex === -1) {
        return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
      }

      const existingMatch = schedules[targetIndex];
      const existingDetails = (await kv.get<MatchDetailsKV>(`twi:match_details:${matchId}`)) || {};

      // 1. Dapatkan gameLogs terbaru (jika ada di payload, pakai yang baru)
      const incomingLogs: GameDetailLog[] = matchData.gameLogs ?? existingDetails.gameLogs ?? existingMatch.gameLogs ?? [];

      // 2. KALKULASI SKOR AUTOMATIS DARI GAME LOGS
      let calculatedScoreA = 0;
      let calculatedScoreB = 0;

      incomingLogs.forEach((log) => {
        if (log.winnerTeamId === existingMatch.teamAId) calculatedScoreA++;
        else if (log.winnerTeamId === existingMatch.teamBId) calculatedScoreB++;
      });

      // Tentukan apakah match sudah selesai (misal salah satu tim menang 10 game / ditentukan manual)
      const isFinishedCalculated = matchData.isFinished ?? (calculatedScoreA >= 10 || calculatedScoreB >= 10);

      const newMatchDate = matchData.matchDate || existingMatch.matchDate;
      const calculatedWeek = computeWeekNumber(newMatchDate);

      // Preserve Data Referee/Streamer jika payload hanya update lineup
      const finalReferee = matchData.referee !== undefined ? matchData.referee : (existingDetails.referee || existingMatch.referee || '');
      const finalRefereeDiscordId = matchData.refereeDiscordId !== undefined ? matchData.refereeDiscordId : (existingDetails.refereeDiscordId || existingMatch.refereeDiscordId || '');
      const finalStreamer = matchData.streamer !== undefined ? matchData.streamer : (existingDetails.streamer || existingMatch.streamer || '');
      const finalStreamerDiscordId = matchData.streamerDiscordId !== undefined ? matchData.streamerDiscordId : (existingDetails.streamerDiscordId || existingMatch.streamerDiscordId || '');
      const finalStreamLink = matchData.streamLink !== undefined ? matchData.streamLink : (existingDetails.streamLink || existingMatch.streamLink || '');

      // 3. UPDATE DETAIL KHUSUS DI KEY TERPISAH (`twi:match_details:{matchId}`)
      const updatedDetails: MatchDetailsKV = {
        matchId,
        lineupA: matchData.lineupA ?? existingDetails.lineupA ?? existingMatch.lineupA ?? [],
        lineupB: matchData.lineupB ?? existingDetails.lineupB ?? existingMatch.lineupB ?? [],
        gameLogs: incomingLogs,
        warningLogs: matchData.warningLogs ?? existingDetails.warningLogs ?? [],
        referee: finalReferee,
        refereeDiscordId: finalRefereeDiscordId,
        streamer: finalStreamer,
        streamerDiscordId: finalStreamerDiscordId,
        streamLink: finalStreamLink,
        lateDecksA: matchData.lateDecksA ?? existingDetails.lateDecksA ?? 0,
        lateDecksB: matchData.lateDecksB ?? existingDetails.lateDecksB ?? 0,
        isLineupLocked: matchData.isLineupLocked ?? existingDetails.isLineupLocked ?? false,
        rosterA: matchData.rosterA ?? existingDetails.rosterA ?? existingMatch.rosterA,
        rosterB: matchData.rosterB ?? existingDetails.rosterB ?? existingMatch.rosterB,
      };

      await kv.set(`twi:match_details:${matchId}`, updatedDetails);

      // 4. UPDATE DATA RINGKAS DI SCHEDULES UTAMA
      const updatedScheduleItem: MatchScheduleItem = {
        ...existingMatch,
        matchDate: newMatchDate,
        weekNumber: calculatedWeek,
        scoreA: calculatedScoreA,
        scoreB: calculatedScoreB,
        isFinished: isFinishedCalculated,
        referee: finalReferee,
        refereeDiscordId: finalRefereeDiscordId,
        streamer: finalStreamer,
        streamerDiscordId: finalStreamerDiscordId,
        streamLink: finalStreamLink,
      };

      // BERSIHKAN FIELD HEAVY DARI SCHEDULES UTAMA (AUTO-MIGRATE / STRIP HEAVY DATA)
      delete (updatedScheduleItem as any).gameLogs;
      delete (updatedScheduleItem as any).lineupA;
      delete (updatedScheduleItem as any).lineupB;

      schedules[targetIndex] = updatedScheduleItem;
      await kv.set(KV_KEY_SCHEDULES, schedules);

      // 5. HITUNG UANG KLASEMEN REALTME
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const masterTeams = [
        ...(rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A })),
        ...(rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B })),
      ];
      const standings = calculateStandings(schedules, masterTeams);

      return NextResponse.json({
        success: true,
        message: 'Data match berhasil diperbarui di KV!',
        updatedMatch: {
          ...updatedScheduleItem,
          ...updatedDetails,
        },
        standings,
      });
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

  const startDateStr = process.env.TWI_START_DATE || '2026-08-03';
  const startWednesdayUTC = new Date(`${startDateStr}T13:00:00.000Z`);

  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesA = roundsA[r] || [];
    const roundMatchesB = roundsB[r] || [];
    const weekNumber = r + 1;

    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const matchDate = new Date(startWednesdayUTC);
      matchDate.setDate(matchDate.getDate() + (r * 7) + dayOffset);

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