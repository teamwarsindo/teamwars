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

    // Jika jadwal belum pernah dibuat di KV, buatkan Single Round Robin otomatis dari hasil Spin
    if (schedules.length === 0 && (groupA.length > 0 || groupB.length > 0)) {
      schedules = generateRoundRobinSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    const masterTeams = [...groupA, ...groupB];
    const standings = calculateStandings(schedules, masterTeams);

    return NextResponse.json({
      schedules,
      standings,
      groupA,
      groupB,
    });
  } catch (error) {
    console.error('Error GET Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, matchId, scoreA, scoreB, referee, streamer, caster, streamLink, rosterA, rosterB, gameLogs } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    // 1. UPDATE MATCH ADMIN INFO & QUICK SCORE (10 - 4)
    if (action === 'UPDATE_MATCH_SCORE') {
      schedules = schedules.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
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

    // 2. UPDATE ROSTER & GAME LOGS DARI ANALYST
    if (action === 'SAVE_ANALYST_REPORT') {
      schedules = schedules.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            rosterA: rosterA ?? match.rosterA,
            rosterB: rosterB ?? match.rosterB,
            gameLogs: gameLogs ?? match.gameLogs,
            scoreA: gameLogs ? gameLogs.filter((g: any) => g.winnerTeamId === match.teamAId).length : match.scoreA,
            scoreB: gameLogs ? gameLogs.filter((g: any) => g.winnerTeamId === match.teamBId).length : match.scoreB,
            isFinished: true,
          };
        }
        return match;
      });
    }

    await kv.set(KV_KEY_SCHEDULES, schedules);
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('Error POST Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Generator Jadwal Single Round Robin Otomatis dari Group A & Group B
function generateRoundRobinSchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  const createGroupMatches = (groupTeams: any[], groupName: "Group A" | "Group B") => {
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: new Date().toISOString(),
          stage: "GROUP_STAGE",
          groupName,
          teamAId: groupTeams[i].name,
          teamAName: groupTeams[i].name,
          teamALogo: groupTeams[i].logo || "/logo.webp",
          teamBId: groupTeams[j].name,
          teamBName: groupTeams[j].name,
          teamBLogo: groupTeams[j].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "vG®D WHY",
          streamer: "Alroy_Yuan",
          caster: "Valdo",
          streamPlatform: "Youtube",
        });
      }
    }
  };

  createGroupMatches(groupA, "Group A");
  createGroupMatches(groupB, "Group B");

  return schedules;
}
