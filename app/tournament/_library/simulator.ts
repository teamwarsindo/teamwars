import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface UpcomingOpponentItem {
  teamName: string;
  teamLogo: string;
}

export interface PlayoffProbabilityResult {
  teamName: string;
  totalSimulations: number;
  quarterFinalsProb: number;
  playInsProb: number;
  eliminationProb: number;
  remainingMatchesCount: number;
  magicWinsNeeded: number;
  lossTolerance: number;
  isGuaranteedEliminated: boolean;
  projectedRankRange: string;
  statusRisk: "HIGH" | "MEDIUM" | "SAFE";
  shuffledOpponents: UpcomingOpponentItem[];
  tacticalAdvice: string[];
}

function seededShuffle<T>(array: T[], seedStr: string): T[] {
  const arr = [...array];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = Math.abs(seed) / 233280;
    const j = Math.floor(rnd * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function simulateTeamPlayoffStrategy(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 1500
): PlayoffProbabilityResult {
  const cleanTarget = targetTeamName.toLowerCase().trim();
  const currentStanding = standings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

  const unfinishedMatches = allSchedules.filter((m) => !m.isFinished);
  const myRemainingMatches = unfinishedMatches.filter(
    (m) =>
      m.teamAName.toLowerCase().trim() === cleanTarget ||
      m.teamBName.toLowerCase().trim() === cleanTarget
  );

  const remCount = myRemainingMatches.length;

  const rawOpponents: UpcomingOpponentItem[] = myRemainingMatches.map((m) => {
    const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
    return {
      teamName: isA ? m.teamBName : m.teamAName,
      teamLogo: (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp",
    };
  });

  const shuffledOpponents = seededShuffle(rawOpponents, targetTeamName);

  if (remCount === 0 || !currentStanding) {
    const isTopDiv = (currentStanding?.rank || 99) <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP;
    const globalList = buildGlobalStandings(standings);
    const isPlayIns = globalList.some(
      (g) => !g.isTopGroup && g.teamName.toLowerCase().trim() === cleanTarget && g.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
    );

    return {
      teamName: targetTeamName,
      totalSimulations: 0,
      quarterFinalsProb: isTopDiv ? 100 : 0,
      playInsProb: isPlayIns ? 100 : 0,
      eliminationProb: !isTopDiv && !isPlayIns ? 100 : 0,
      remainingMatchesCount: 0,
      magicWinsNeeded: 0,
      lossTolerance: 0,
      isGuaranteedEliminated: !isTopDiv && !isPlayIns,
      projectedRankRange: isTopDiv ? "Top 2 Divisi" : isPlayIns ? "Top 8 Wildcard" : "Eliminasi",
      statusRisk: isTopDiv || isPlayIns ? "SAFE" : "HIGH",
      shuffledOpponents: [],
      tacticalAdvice: ["Seluruh pertandingan fase reguler telah selesai."],
    };
  }

  const currentWins = currentStanding.matchWins || 0;
  const currentLosses = currentStanding.matchLosses || 0;
  const maxPossibleWins = currentWins + remCount;

  // Threshold Play-Ins adalah 3 win
  const targetThresholdWins = 3;
  const magicWinsNeeded = Math.max(0, targetThresholdWins - currentWins);
  const lossTolerance = Math.max(0, remCount - magicWinsNeeded);
  const isGuaranteedEliminated = maxPossibleWins < targetThresholdWins;

  if (isGuaranteedEliminated) {
    return {
      teamName: targetTeamName,
      totalSimulations: iterations,
      quarterFinalsProb: 0,
      playInsProb: 0,
      eliminationProb: 100,
      remainingMatchesCount: remCount,
      magicWinsNeeded,
      lossTolerance: 0,
      isGuaranteedEliminated: true,
      projectedRankRange: "Gugur (Rank #9-#12)",
      statusRisk: "HIGH",
      shuffledOpponents,
      tacticalAdvice: [
        "Tim telah dipastikan 100% gugur dari perebutan tiket Playoff.",
        "Fokuskan sisa laga untuk menjaga rekor individu duelis dan sportivitas kompetisi.",
      ],
    };
  }

  let quarterWins = 0;
  let playInsWins = 0;
  let eliminatedCount = 0;
  const simulatedRanks: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const simMatches: MatchScheduleItem[] = allSchedules.map((m) => {
      if (m.isFinished) return m;

      const rand = Math.random();
      let scoreA = 10;
      let scoreB = Math.floor(Math.random() * 6) + 3;

      if (rand < 0.5) {
        const temp = scoreA;
        scoreA = scoreB;
        scoreB = temp;
      }

      return {
        ...m,
        isFinished: true,
        scoreA,
        scoreB,
      };
    });

    const simStandings = calculateStandings(simMatches, standings);
    const mySim = simStandings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

    if (mySim) {
      if (mySim.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
        quarterWins++;
        simulatedRanks.push(mySim.rank);
      } else {
        const globalStandings = buildGlobalStandings(simStandings);
        const wItem = globalStandings.find(
          (g) => !g.isTopGroup && g.teamName.toLowerCase().trim() === cleanTarget
        );
        if (wItem && wItem.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
          playInsWins++;
          simulatedRanks.push(wItem.rank + 4);
        } else {
          eliminatedCount++;
          simulatedRanks.push(12);
        }
      }
    }
  }

  const quarterFinalsProb = Math.round((quarterWins / iterations) * 100);
  const playInsProb = Math.round((playInsWins / iterations) * 100);
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  simulatedRanks.sort((a, b) => a - b);
  const p25 = simulatedRanks[Math.floor(simulatedRanks.length * 0.25)] || 5;
  const p75 = simulatedRanks[Math.floor(simulatedRanks.length * 0.75)] || 10;

  const projectedRankRange =
    quarterFinalsProb > 50
      ? "Top 2 Divisi (#1-#2)"
      : eliminationProb > 60
      ? "Eliminasi (#9-#12)"
      : `#${Math.max(1, p25 - 2)} - #${Math.min(8, p75 - 2)} Wildcard`;

  let statusRisk: "HIGH" | "MEDIUM" | "SAFE" = "MEDIUM";
  if (eliminationProb >= 50) statusRisk = "HIGH";
  else if (quarterFinalsProb + playInsProb >= 75) statusRisk = "SAFE";

  const tacticalAdvice: string[] = [];

  // Syarat wajib menang & titik kritis gugur
  if (lossTolerance === 0) {
    tacticalAdvice.push(
      `Status Wajib Menang: Tim tidak memiliki toleransi kekalahan lagi. Setiap sisa laga harus dimenangkan untuk lolos.`
    );
  } else {
    tacticalAdvice.push(
      `Toleransi Kekalahan: Maksimal ${lossTolerance} kekalahan lagi. Menelan ${lossTolerance + 1} kekalahan lagi memastikan tim gugur 100%.`
    );
  }

  // Rekomendasi margin poin
  if (currentStanding.roundDifference < 0) {
    tacticalAdvice.push(
      `Manajemen Poin: Defisit (${currentStanding.roundDifference}) sangat rawan. Jika menang targetkan skor telak (10-3/10-4). Jika tertinggal, raih minimal 7–8 set kemenangan untuk menekan defisit.`
    );
  } else {
    tacticalAdvice.push(
      `Manajemen Poin: Modal selisih poin (+${currentStanding.roundDifference}) menjadi keunggulan besar saat terjadi tiebreaker klasemen.`
    );
  }

  return {
    teamName: targetTeamName,
    totalSimulations: iterations,
    quarterFinalsProb,
    playInsProb,
    eliminationProb,
    remainingMatchesCount: remCount,
    magicWinsNeeded,
    lossTolerance,
    isGuaranteedEliminated,
    projectedRankRange,
    statusRisk,
    shuffledOpponents,
    tacticalAdvice,
  };
}
  
