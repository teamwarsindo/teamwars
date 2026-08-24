import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface TacticalMatchItem {
  matchId: string;
  opponentName: string;
  opponentLogo: string;
  opponentRank: number | string;
  winProbability: number;
  criticalityScore: number; // 0 - 100
  strategyTag: "MUST_WIN" | "UPSET_OPPORTUNITY" | "HIGH_VALUE_WIN";
  tagLabel: string;
  description: string;
}

export interface ScenarioTier {
  safeRecord: string;        // e.g. "4-0"
  safeProb: number;
  competitiveRecord: string; // e.g. "3-1"
  competitiveProb: number;
  survivalRecord: string;    // e.g. "2-2"
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

// 🟢 1. TEAM STRENGTH MODEL (LOGISTIC POWER RATING)
function calculateMatchWinProb(teamA: ExtendedStandingItem, teamB: ExtendedStandingItem): number {
  const wrA = teamA.matchPlayed > 0 ? (teamA.matchWins / teamA.matchPlayed) * 100 : 50;
  const wrB = teamB.matchPlayed > 0 ? (teamB.matchWins / teamB.matchPlayed) * 100 : 50;

  const diffA = teamA.matchPlayed > 0 ? teamA.roundDifference / teamA.matchPlayed : 0;
  const diffB = teamB.matchPlayed > 0 ? teamB.roundDifference / teamB.matchPlayed : 0;

  // Power index
  const powerA = wrA + diffA * 2.5;
  const powerB = wrB + diffB * 2.5;

  const diff = powerA - powerB;
  const probA = 1 / (1 + Math.pow(10, -diff / 40));
  return Math.max(0.15, Math.min(0.85, probA));
}

// 🟢 2. ENGINE UTAMA
export function generateAdvancedPlayoffAnalytics(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 3000
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

  // Evaluasi Tiap Laga Sisa
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
    let tagLabel = "High-Value Win";
    let criticalityScore = 70;
    let description = "Peluang menambah modal poin & mengamankan posisi.";

    if (isDirectCompetitor) {
      strategyTag = "MUST_WIN";
      tagLabel = "🔥 MUST WIN (6-Pt Swing)";
      criticalityScore = 95;
      description = "Rival langsung! Kemenangan mencegah rival mencuri kuota.";
    } else if (isTopTwo) {
      strategyTag = "UPSET_OPPORTUNITY";
      tagLabel = "⚡ Upset Opportunity";
      criticalityScore = 60;
      description = "Kekalahan di sini wajar; targetkan skor set ketat (8-10).";
    }

    tacticalMatches.push({
      matchId: m.id,
      opponentName: oppName,
      opponentLogo: oppLogo,
      opponentRank: oppRank,
      winProbability: Math.round(myWinProb * 100),
      criticalityScore,
      strategyTag,
      tagLabel,
      description,
    });
  });

  const rawSos = remCount > 0 ? Math.round(totalOppStrength / remCount) : 50;
  const sosRating = Math.max(15, Math.min(90, rawSos));
  const sosLabel = sosRating >= 65 ? "Berat" : sosRating <= 40 ? "Ringan" : "Moderat";

  // Monte Carlo Simulation
  let quarterWins = 0;
  let playInsWins = 0;
  const outcomeStats = new Map<number, { count: number; qWins: number; pWins: number }>();

  for (let w = 0; w <= remCount; w++) {
    outcomeStats.set(w, { count: 0, qWins: 0, pWins: 0 });
  }

  // Tracking Conditional untuk Laga Terdekat
  let nextMatchWinCount = 0;
  let nextMatchWinSuccess = 0;
  let nextMatchLossCount = 0;
  let nextMatchLossSuccess = 0;

  for (let i = 0; i < iterations; i++) {
    let mySimWins = 0;
    let nextMatchWon = false;

    const simMatches: MatchScheduleItem[] = allSchedules.map((m, idx) => {
      if (m.isFinished) return m;

      const isTargetMatch =
        m.teamAName.toLowerCase().trim() === cleanTarget ||
        m.teamBName.toLowerCase().trim() === cleanTarget;

      const teamAItem = standings.find((s) => s.teamName.toLowerCase().trim() === m.teamAName.toLowerCase().trim());
      const teamBItem = standings.find((s) => s.teamName.toLowerCase().trim() === m.teamBName.toLowerCase().trim());

      const probA = (teamAItem && teamBItem) ? calculateMatchWinProb(teamAItem, teamBItem) : 0.5;
      const wonA = Math.random() < probA;

      let scoreA = wonA ? 10 : Math.floor(Math.random() * 5) + 4;
      let scoreB = wonA ? Math.floor(Math.random() * 5) + 4 : 10;

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

  // 🟢 3. TARGET STRATEGIS 3-TIER
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

  // 🟢 4. CONDITIONAL SCENARIOS
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

  // 🟢 5. STRATEGIC TAKEAWAYS
  const strategicTakeaways: string[] = [];
  const mustWinCount = tacticalMatches.filter((m) => m.strategyTag === "MUST_WIN").length;

  if (mustWinCount > 0) {
    strategicTakeaways.push(`Prioritas #1: Wajib amankan laga 6-Point Swing melawan rival langsung.`);
  }
  strategicTakeaways.push(`Target Realistis: Raih rekor sisa ${targets.competitiveRecord} untuk mengunci peluang Play-Ins ${targets.competitiveProb}%.`);
  if (targets.survivalProb <= 15 && remCount >= 3) {
    strategicTakeaways.push(`Batas Kritis: Rekor ${targets.survivalRecord} hanya menyisakan peluang ${targets.survivalProb}% (Zona Bahaya).`);
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