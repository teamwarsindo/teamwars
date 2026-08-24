import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface TacticalMatchItem {
  matchId: string;
  opponentName: string;
  opponentLogo: string;
  opponentRank: number | string;
  winProbability: number;
  strategyTag: "MUST_WIN" | "UPSET_OPPORTUNITY" | "HIGH_VALUE_WIN";
  tagLabel: string;
  description: string;
}

export interface ScenarioTier {
  safeRecord: string;
  safeProb: number;
  competitiveRecord: string;
  competitiveProb: number;
  survivalRecord: string;
  survivalProb: number;
}

export interface ConditionalImpact {
  nextOpponentName: string;
  winImpactProb: number;
  loseImpactProb: number;
  loseRequiredRecord: string;
}

export interface AdvancedPlayoffAnalytics {
  teamName: string;
  currentWins: number;
  currentLosses: number;
  currentPtsDiff: number;
  remainingMatchesCount: number;
  sosRating: number;
  sosLabel: "Ringan" | "Moderat" | "Berat";
  quarterFinalsProb: number;
  playInsProb: number;
  eliminationProb: number;
  targets: ScenarioTier;
  tacticalMatches: TacticalMatchItem[];
  conditional: ConditionalImpact | null;
  strategicTakeaways: string[];
}

function calculateMatchWinProb(teamA: ExtendedStandingItem, teamB: ExtendedStandingItem): number {
  const wrA = teamA.matchPlayed > 0 ? (teamA.matchWins / teamA.matchPlayed) * 100 : 50;
  const wrB = teamB.matchPlayed > 0 ? (teamB.matchWins / teamB.matchPlayed) * 100 : 50;

  const diffA = teamA.matchPlayed > 0 ? teamA.roundDifference / teamA.matchPlayed : 0;
  const diffB = teamB.matchPlayed > 0 ? teamB.roundDifference / teamB.matchPlayed : 0;

  const powerA = wrA + diffA * 3;
  const powerB = wrB + diffB * 3;

  const diff = powerA - powerB;
  const probA = 1 / (1 + Math.pow(10, -diff / 35));
  return Math.max(0.15, Math.min(0.85, probA));
}

function generateRealisticScore(winnerA: boolean) {
  // Rentang skor kekalahan 0 s.d. 9 (Mendukung skor 10-0 s/d 10-9)
  const loserScore = Math.floor(Math.random() * 10);
  return winnerA ? { scoreA: 10, scoreB: loserScore } : { scoreA: loserScore, scoreB: 10 };
}

export function generateAdvancedPlayoffAnalytics(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 2500
): AdvancedPlayoffAnalytics {
  const cleanTarget = targetTeamName.toLowerCase().trim();
  const currentStanding = standings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

  const unfinishedMatches = allSchedules.filter((m) => !m.isFinished);
  const myRemainingMatches = unfinishedMatches.filter(
    (m) =>
      m.teamAName.toLowerCase().trim() === cleanTarget ||
      m.teamBName.toLowerCase().trim() === cleanTarget
  );

  const remCount = myRemainingMatches.length;
  const currentWins = currentStanding?.matchWins || 0;
  const currentLosses = currentStanding?.matchLosses || 0;
  const currentPtsDiff = currentStanding?.roundDifference || 0;

  let totalOppStrength = 0;
  const tacticalMatches: TacticalMatchItem[] = [];

  myRemainingMatches.forEach((m) => {
    const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
    const oppName = isA ? m.teamBName : m.teamAName;
    const oppLogo = (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp";
    const oppStanding = standings.find((s) => s.teamName.toLowerCase().trim() === oppName.toLowerCase().trim()) || {
      rank: 99, matchWins: 0, matchLosses: 0, matchPlayed: 0, roundDifference: 0, groupName: DIVISION_MAP.GROUP_A
    } as any;

    const myWinProb = currentStanding ? calculateMatchWinProb(currentStanding, oppStanding) : 0.5;
    totalOppStrength += (1 - myWinProb) * 100;

    const oppRank = oppStanding.rank;
    const isDirectCompetitor = Math.abs((currentStanding?.rank || 8) - oppRank) <= 2;
    const isTopTwo = oppRank <= 2;

    let strategyTag: TacticalMatchItem["strategyTag"] = "HIGH_VALUE_WIN";
    let tagLabel = "Pesaing";
    let description = "Peluang modal poin.";

    if (isDirectCompetitor) {
      strategyTag = "MUST_WIN";
      tagLabel = "🔥 Rival Langsung";
      description = "Wajib menang untuk jegal rival.";
    } else if (isTopTwo) {
      strategyTag = "UPSET_OPPORTUNITY";
      tagLabel = "⚡ Upset";
      description = "Amankan set ketat jika tertinggal.";
    }

    tacticalMatches.push({
      matchId: m.id,
      opponentName: oppName,
      opponentLogo: oppLogo,
      opponentRank: oppRank,
      winProbability: Math.round(myWinProb * 100),
      strategyTag,
      tagLabel,
      description,
    });
  });

  const rawSos = remCount > 0 ? Math.round(totalOppStrength / remCount) : 50;
  const sosRating = Math.max(15, Math.min(90, rawSos));
  const sosLabel = sosRating >= 65 ? "Berat" : sosRating <= 40 ? "Ringan" : "Moderat";

  let quarterWins = 0;
  let playInsWins = 0;
  const outcomeStats = new Map<number, { count: number; qWins: number; pWins: number }>();

  for (let w = 0; w <= remCount; w++) {
    outcomeStats.set(w, { count: 0, qWins: 0, pWins: 0 });
  }

  let nextMatchWinCount = 0;
  let nextMatchWinSuccess = 0;
  let nextMatchLossCount = 0;
  let nextMatchLossSuccess = 0;

  for (let i = 0; i < iterations; i++) {
    let mySimWins = 0;
    let nextMatchWon = false;

    const simMatches: MatchScheduleItem[] = allSchedules.map((m) => {
      if (m.isFinished) return m;

      const isTargetMatch =
        m.teamAName.toLowerCase().trim() === cleanTarget ||
        m.teamBName.toLowerCase().trim() === cleanTarget;

      const teamAItem = standings.find((s) => s.teamName.toLowerCase().trim() === m.teamAName.toLowerCase().trim());
      const teamBItem = standings.find((s) => s.teamName.toLowerCase().trim() === m.teamBName.toLowerCase().trim());

      const probA = (teamAItem && teamBItem) ? calculateMatchWinProb(teamAItem, teamBItem) : 0.5;
      const wonA = Math.random() < probA;

      const { scoreA, scoreB } = generateRealisticScore(wonA);

      if (isTargetMatch) {
        const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
        const won = (isA && wonA) || (!isA && !wonA);
        if (won) mySimWins++;

        if (m.id === myRemainingMatches[0]?.id) {
          nextMatchWon = won;
        }
      }

      return { ...m, isFinished: true, scoreA, scoreB };
    });

    const simStandings = calculateStandings(simMatches, standings);
    const mySim = simStandings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

    let isQualified = false;
    let isQ = false;
    let isP = false;

    if (mySim) {
      if (mySim.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
        quarterWins++;
        isQ = true;
        isQualified = true;
      } else {
        const globalStandings = buildGlobalStandings(simStandings);
        const wItem = globalStandings.find(
          (g) => !g.isTopGroup && g.teamName.toLowerCase().trim() === cleanTarget
        );
        if (wItem && wItem.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
          playInsWins++;
          isP = true;
          isQualified = true;
        }
      }
    }

    const stat = outcomeStats.get(mySimWins);
    if (stat) {
      stat.count++;
      if (isQ) stat.qWins++;
      if (isP) stat.pWins++;
    }

    if (nextMatchWon) {
      nextMatchWinCount++;
      if (isQualified) nextMatchWinSuccess++;
    } else {
      nextMatchLossCount++;
      if (isQualified) nextMatchLossSuccess++;
    }
  }

  const quarterFinalsProb = remCount === 0 ? (currentStanding?.rank! <= 2 ? 100 : 0) : Math.round((quarterWins / iterations) * 100);
  const playInsProb = remCount === 0 ? (currentStanding?.rank! > 2 && currentStanding?.rank! <= 8 ? 100 : 0) : Math.round((playInsWins / iterations) * 100);
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  const getProbForWins = (w: number) => {
    const s = outcomeStats.get(w);
    if (!s || s.count === 0) return 0;
    return Math.round(((s.qWins + s.pWins) / s.count) * 100);
  };

  const targets: ScenarioTier = {
    safeRecord: `${remCount}-0`,
    safeProb: getProbForWins(remCount) || 99,
    competitiveRecord: `${Math.max(0, remCount - 1)}-1`,
    competitiveProb: getProbForWins(Math.max(0, remCount - 1)) || 85,
    survivalRecord: `${Math.max(0, remCount - 2)}-2`,
    survivalProb: getProbForWins(Math.max(0, remCount - 2)) || 10,
  };

  let conditional: ConditionalImpact | null = null;
  if (myRemainingMatches.length > 0) {
    const nextOpp = tacticalMatches[0];
    conditional = {
      nextOpponentName: nextOpp.opponentName,
      winImpactProb: nextMatchWinCount > 0 ? Math.round((nextMatchWinSuccess / nextMatchWinCount) * 100) : playInsProb,
      loseImpactProb: nextMatchLossCount > 0 ? Math.round((nextMatchLossSuccess / nextMatchLossCount) * 100) : 0,
      loseRequiredRecord: `${remCount - 1}-0`,
    };
  }

  const strategicTakeaways: string[] = [];
  if (tacticalMatches.some((m) => m.strategyTag === "MUST_WIN")) {
    strategicTakeaways.push(`Kunci Play-Ins: Wajib amankan laga melawan rival langsung.`);
  }
  strategicTakeaways.push(`Target Realistis: Raih ${targets.competitiveRecord} untuk garansi lolos ${targets.competitiveProb}%.`);
  if (currentPtsDiff < 0) {
    strategicTakeaways.push(`Defisit set (${currentPtsDiff}): Targetkan menang telak (10-3/10-4) dan hindari kalah telak.`);
  }

  return {
    teamName: targetTeamName,
    currentWins,
    currentLosses,
    currentPtsDiff,
    remainingMatchesCount: remCount,
    sosRating,
    sosLabel,
    quarterFinalsProb,
    playInsProb,
    eliminationProb,
    targets,
    tacticalMatches,
    conditional,
    strategicTakeaways,
  };
}