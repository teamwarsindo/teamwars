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
  // Hanya ambil match reguler (bukan match playoff) untuk perhitungan standing
  const regularSchedules = schedules.filter((m) => !m.id.startsWith("match-po-"));
  const standings = calculateStandings(regularSchedules, masterTeams);
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

// Helper mencari tanggal Kamis pada minggu ke-N turnamen
function getWeekThursdayDate(weekNumber: number): Date {
  const startDate = new Date(TWI_START_DATETIME);
  // Geser ke minggu target (weekNumber 8 = +7 minggu)
  startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);

  // Setel ke hari Kamis (4) pada pekan tersebut
  const day = startDate.getDay();
  const diffToThursday = (4 - day + 7) % 7;
  startDate.setDate(startDate.getDate() + diffToThursday);

  // Set waktu default 20:00 WIB (13:00 UTC)
  startDate.setUTCHours(13, 0, 0, 0);
  return startDate;
}

// 🟢 2. FUNGSI GENERATE 11 MATCH PLAYOFF DENGAN JADWAL TERACAK (KAMIS - MINGGU)
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

  const createMatch = (
    id: string,
    stage: any,
    groupName: string,
    weekNumber: number,
    matchDate: Date,
    teamA: any,
    teamB: any,
    placeholderA: string,
    placeholderB: string
  ): MatchScheduleItem => {
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

  // 1. Tentukan 4 Hari Play-Ins (Kamis=0, Jumat=1, Sabtu=2, Minggu=3)
  const week8Thursday = getWeekThursdayDate(8);
  const playInDates = [0, 1, 2, 3].map((offset) => {
    const d = new Date(week8Thursday);
    d.setDate(d.getDate() + offset);
    return d;
  });

  // 2. ACAK HANYA HARI TANDINGNYA (Bagan lawan tetap!)
  const shuffledDates = [...playInDates].sort(() => Math.random() - 0.5);

  // 3. Pasangan Play-Ins Tetap Sesuai Seed Resmi
  const playIns = [
    { id: "match-po-1", name: "Play-Ins #1", tA: s(1), tB: s(8), pA: "Wildcard Seed 1", pB: "Wildcard Seed 8" },
    { id: "match-po-2", name: "Play-Ins #2", tA: s(4), tB: s(5), pA: "Wildcard Seed 4", pB: "Wildcard Seed 5" },
    { id: "match-po-3", name: "Play-Ins #3", tA: s(2), tB: s(7), pA: "Wildcard Seed 2", pB: "Wildcard Seed 7" },
    { id: "match-po-4", name: "Play-Ins #4", tA: s(3), tB: s(6), pA: "Wildcard Seed 3", pB: "Wildcard Seed 6" },
  ];

  playIns.forEach((match, idx) => {
    playoffSchedules.push(
      createMatch(
        match.id,
        "PLAY_INS",
        match.name,
        8,
        shuffledDates[idx], // Hari acak Kamis - Minggu
        match.tA,
        match.tB,
        match.pA,
        match.pB
      )
    );
  });

  // Quarter-Finals (Week 9: Kamis - Minggu)
  const week9Thursday = getWeekThursdayDate(9);
  const qfDate = (offset: number) => {
    const d = new Date(week9Thursday);
    d.setDate(d.getDate() + offset);
    return d;
  };

  playoffSchedules.push(
    createMatch("match-po-5", "QUARTER_FINAL", "Quarter-Final #1", 9, qfDate(0), top1A, null, `Top 1 ${DIVISION_MAP.GROUP_A}`, "Winner Play-Ins #1"),
    createMatch("match-po-6", "QUARTER_FINAL", "Quarter-Final #2", 9, qfDate(1), top2B, null, `Top 2 ${DIVISION_MAP.GROUP_B}`, "Winner Play-Ins #2"),
    createMatch("match-po-7", "QUARTER_FINAL", "Quarter-Final #3", 9, qfDate(2), top1B, null, `Top 1 ${DIVISION_MAP.GROUP_B}`, "Winner Play-Ins #3"),
    createMatch("match-po-8", "QUARTER_FINAL", "Quarter-Final #4", 9, qfDate(3), top2A, null, `Top 2 ${DIVISION_MAP.GROUP_A}`, "Winner Play-Ins #4")
  );

  // Semi-Finals (Week 10: Sabtu & Minggu)
  const week10Thursday = getWeekThursdayDate(10);
  const sfDate = (offset: number) => {
    const d = new Date(week10Thursday);
    d.setDate(d.getDate() + offset);
    return d;
  };

  playoffSchedules.push(
    createMatch("match-po-9", "SEMI_FINAL", "Semi-Final #1", 10, sfDate(2), null, null, "Winner Quarter-Final #1", "Winner Quarter-Final #2"),
    createMatch("match-po-10", "SEMI_FINAL", "Semi-Final #2", 10, sfDate(3), null, null, "Winner Quarter-Final #3", "Winner Quarter-Final #4")
  );

  // Grand Final (Week 11: Minggu)
  const week11Thursday = getWeekThursdayDate(11);
  const gfDate = new Date(week11Thursday);
  gfDate.setDate(gfDate.getDate() + 3);

  playoffSchedules.push(
    createMatch("match-po-11", "GRAND_FINAL", "Grand Final Championship", 11, gfDate, null, null, "Winner Semi-Final #1", "Winner Semi-Final #2")
  );

  return playoffSchedules;
    }
