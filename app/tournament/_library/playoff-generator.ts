import { kv } from "@vercel/kv";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  TWI_START_DATETIME,
  getTeamSlug,
} from "@/app/tournament/_library";
import {
  calculateStandings,
  buildGlobalStandings,
} from "@/app/tournament/_library/calculator";
import {
  CURRENT_SEASON,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library/constants";

export const KV_KEY_PLAYOFF_TEAMS = "twi:playoff_teams";

// Helper ambil profil resmi langsung dari HASH teams:<slug>
export async function getTeamDetailFromHash(teamName: string, fallbackLogo: string = "/logo.webp") {
  const teamId = getTeamSlug(teamName);
  try {
    const hashData = await kv.hgetall<any>(`teams:${teamId}`);
    return {
      teamId,
      teamName: hashData?.namaTim || teamName,
      teamLogo: hashData?.logoTim || fallbackLogo,
      teamColor: hashData?.warna || "#3b82f6",
    };
  } catch {
    return {
      teamId,
      teamName,
      teamLogo: fallbackLogo,
      teamColor: "#3b82f6",
    };
  }
}

// 🟢 1. FUNGSI KUNCI TIM PLAYOFF
export async function lockPlayoffTeamsFromStandings(
  schedules: MatchScheduleItem[],
  masterTeams: any[]
) {
  const standings = calculateStandings(schedules, masterTeams);
  const groupAStandings = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  const groupBStandings = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);

  const directSlots = [
    { slot: "TOP_1_GROUP_A", standing: groupAStandings[0] },
    { slot: "TOP_2_GROUP_A", standing: groupAStandings[1] },
    { slot: "TOP_1_GROUP_B", standing: groupBStandings[0] },
    { slot: "TOP_2_GROUP_B", standing: groupBStandings[1] },
  ];

  const directQuarterFinals = await Promise.all(
    directSlots.map(async ({ slot, standing }) => {
      const detail = await getTeamDetailFromHash(standing.teamName, standing.teamLogo);
      return { slot, ...detail };
    })
  );

  const rawWildcards = buildGlobalStandings(standings)
    .filter((t) => !t.isTopGroup)
    .slice(0, TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA);

  const wildcardSeeds = await Promise.all(
    rawWildcards.map(async (w, index) => {
      const detail = await getTeamDetailFromHash(w.teamName, w.teamLogo);
      return { seed: index + 1, ...detail };
    })
  );

  const payload = {
    lockedAt: new Date().toISOString(),
    season: CURRENT_SEASON,
    directQuarterFinals,
    wildcardSeeds,
  };

  await kv.set(KV_KEY_PLAYOFF_TEAMS, payload);
  return payload;
}

// 🟢 2. FUNGSI GENERATE 11 MATCH PLAYOFF
export function generatePlayoffSchedules(
  directQF: any[],
  wildcardSeeds: any[]
): MatchScheduleItem[] {
  const playoffSchedules: MatchScheduleItem[] = [];

  const getDirect = (slot: string) => directQF.find((d) => d.slot === slot);
  const getSeed = (seedNum: number) => wildcardSeeds.find((w) => w.seed === seedNum);

  const top1A = getDirect("TOP_1_GROUP_A");
  const top2A = getDirect("TOP_2_GROUP_A");
  const top1B = getDirect("TOP_1_GROUP_B");
  const top2B = getDirect("TOP_2_GROUP_B");

  const s = (num: number) => getSeed(num);

  const basePlayoffDate = new Date(TWI_START_DATETIME);
  basePlayoffDate.setDate(basePlayoffDate.getDate() + 7 * 7); // Week 8

  const createMatch = (
    id: string,
    stage: any,
    groupName: string,
    weekNumber: number,
    dayOffset: number,
    teamA: any,
    teamB: any,
    placeholderA: string,
    placeholderB: string
  ): MatchScheduleItem => {
    const matchDate = new Date(basePlayoffDate);
    matchDate.setDate(matchDate.getDate() + dayOffset);

    return {
      id,
      matchDate: matchDate.toISOString(),
      stage,
      groupName,
      weekNumber,
      teamAId: teamA?.teamId || teamA?.teamName || placeholderA,
      teamAName: teamA?.teamName || placeholderA,
      teamALogo: teamA?.teamLogo || "/logo.webp",
      teamBId: teamB?.teamId || teamB?.teamName || placeholderB,
      teamBName: teamB?.teamName || placeholderB,
      teamBLogo: teamB?.teamLogo || "/logo.webp",
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      referee: "",
      refereeToken: `REF-${id.toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      streamer: "",
    };
  };

  // Play-Ins (Week 8)
  playoffSchedules.push(
    createMatch("match-po-1", "PLAY_INS", "Play-Ins #1", 8, 0, s(1), s(8), "Wildcard Seed 1", "Wildcard Seed 8"),
    createMatch("match-po-2", "PLAY_INS", "Play-Ins #2", 8, 1, s(4), s(5), "Wildcard Seed 4", "Wildcard Seed 5"),
    createMatch("match-po-3", "PLAY_INS", "Play-Ins #3", 8, 2, s(2), s(7), "Wildcard Seed 2", "Wildcard Seed 7"),
    createMatch("match-po-4", "PLAY_INS", "Play-Ins #4", 8, 3, s(3), s(6), "Wildcard Seed 3", "Wildcard Seed 6")
  );

  // Quarter-Finals (Week 9)
  playoffSchedules.push(
    createMatch("match-po-5", "QUARTER_FINAL", "Quarter-Final #1", 9, 7, top1A, null, `Top 1 ${DIVISION_MAP.GROUP_A}`, "Winner Play-Ins #1"),
    createMatch("match-po-6", "QUARTER_FINAL", "Quarter-Final #2", 9, 8, top2B, null, `Top 2 ${DIVISION_MAP.GROUP_B}`, "Winner Play-Ins #2"),
    createMatch("match-po-7", "QUARTER_FINAL", "Quarter-Final #3", 9, 9, top1B, null, `Top 1 ${DIVISION_MAP.GROUP_B}`, "Winner Play-Ins #3"),
    createMatch("match-po-8", "QUARTER_FINAL", "Quarter-Final #4", 9, 10, top2A, null, `Top 2 ${DIVISION_MAP.GROUP_A}`, "Winner Play-Ins #4")
  );

  // Semi-Finals (Week 10)
  playoffSchedules.push(
    createMatch("match-po-9", "SEMI_FINAL", "Semi-Final #1", 10, 14, null, null, "Winner Quarter-Final #1", "Winner Quarter-Final #2"),
    createMatch("match-po-10", "SEMI_FINAL", "Semi-Final #2", 10, 15, null, null, "Winner Quarter-Final #3", "Winner Quarter-Final #4")
  );

  // Grand Final (Week 11)
  playoffSchedules.push(
    createMatch("match-po-11", "GRAND_FINAL", "Grand Final Championship", 11, 21, null, null, "Winner Semi-Final #1", "Winner Semi-Final #2")
  );

  return playoffSchedules;
}
  
