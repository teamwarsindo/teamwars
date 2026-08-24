import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface TacticalMatchItem {
  matchId: string;
  opponentName: string;
  opponentLogo: string;
  opponentRank: number | string;
  winProb: number;
  playoffIfWin: number;
  playoffIfLose: number;
  leverageImpact: number; // Δ percentage points
  isHighLeverage: boolean;
}

export interface AdvancedDecisionAnalytics {
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
  tiebreakRisk: "LOW" | "MODERATE" | "HIGH";
  tiebreakAdvice: string;
  guaranteedTarget: string;   // misal: 3-1 (100%)
  survivalTarget: string;     // misal: 2-2 (54%)
  tacticalMatches: TacticalMatchItem[];
  primaryDecisionTakeaway: string;
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
  const loserScore = Math.floor(Math.random() * 10); // 0 s.d. 9
  return winnerA ? { scoreA: 10, scoreB: loserScore } : { scoreA: loserScore, scoreB: 10 };
}

export function generateDecisionAnalytics(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 2500
): AdvancedDecisionAnalytics {
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

  // 1. EVALUASI STRENGTH OF SCHEDULE & SISA LAWAN
  let totalOppStrength = 0;
  const remainingOpponentsInfo: { id: string; name: string; logo: string; rank: number | string; winProb: number }[] = [];

  myRemainingMatches.forEach((m) => {
    const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
    const oppName = isA ? m.teamBName : m.teamAName;
    const oppLogo = (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp";
    const oppStanding = standings.find((s) => s.teamName.toLowerCase().trim() === oppName.toLowerCase().trim()) || {
      rank: 99, matchWins: 0, matchLosses: 0, matchPlayed: 0, roundDifference: 0, groupName: DIVISION_MAP.GROUP_A
    } as any;

    const myWinProb = currentStanding ? calculateMatchWinProb(currentStanding, oppStanding) : 0.5;
    totalOppStrength += (1 - myWinProb) * 100;

    remainingOpponentsInfo.push({
      id: m.id,
      name: oppName,
      logo: oppLogo,
      rank: oppStanding.rank,
      winProb: Math.round(myWinProb * 100),
    });
  });

  const rawSos = remCount > 0 ? Math.round(totalOppStrength / remCount) : 50;
  const sosRating = Math.max(15, Math.min(90, rawSos));
  const sosLabel = sosRating >= 65 ? "Berat" : sosRating <= 40 ? "Ringan" : "Moderat";

  // 2. MONTE CARLO SIMULATION
  let quarterWins = 0;
  let playInsWins = 0;
  const outcomeStats = new Map<number, { count: number; qWins: number; pWins: number }>();
  for (let w = 0; w <= remCount; w++) outcomeStats.set(w, { count: 0, qWins: 0, pWins: 0 });

  // Map untuk conditional per match
  const matchConditionalCounters = new Map<string, { wCount: number; wSuccess: number; lCount: number; lSuccess: number }>();
  remainingOpponentsInfo.forEach((opp) => {
    matchConditionalCounters.set(opp.id, { wCount: 0, wSuccess: 0, lCount: 0, lSuccess: 0 });
  });

  for (let i = 0; i < iterations; i++) {
    let mySimWins = 0;
    const simResultsPerMatch = new Map<string, boolean>();

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
        simResultsPerMatch.set(m.id, won);
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

    simResultsPerMatch.forEach((won, matchId) => {
      const counter = matchConditionalCounters.get(matchId);
      if (counter) {
        if (won) {
          counter.wCount++;
          if (isQualified) counter.wSuccess++;
        } else {
          counter.lCount++;
          if (isQualified) counter.lSuccess++;
        }
      }
    });
  }

  const quarterFinalsProb = remCount === 0 ? (currentStanding?.rank! <= 2 ? 100 : 0) : Math.round((quarterWins / iterations) * 100);
  const playInsProb = remCount === 0 ? (currentStanding?.rank! > 2 && currentStanding?.rank! <= 8 ? 100 : 0) : Math.round((playInsWins / iterations) * 100);
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  // 3. COMPILE TACTICAL MATCHES & LEVERAGE
  const tacticalMatches: TacticalMatchItem[] = remainingOpponentsInfo.map((opp) => {
    const c = matchConditionalCounters.get(opp.id);
    const pW = c && c.wCount > 0 ? Math.round((c.wSuccess / c.wCount) * 100) : playInsProb;
    const pL = c && c.lCount > 0 ? Math.round((c.lSuccess / c.lCount) * 100) : 0;
    const leverageImpact = Math.max(0, pW - pL);

    return {
      matchId: opp.id,
      opponentName: opp.name,
      opponentLogo: opp.logo,
      opponentRank: opp.rank,
      winProb: opp.winProb,
      playoffIfWin: pW,
      playoffIfLose: pL,
      leverageImpact,
      isHighLeverage: leverageImpact >= 15,
    };
  }).sort((a, b) => b.leverageImpact - a.leverageImpact);

  // 4. TIE-BREAK RISK ASSESSMENT
  let tiebreakRisk: "LOW" | "MODERATE" | "HIGH" = "LOW";
  let tiebreakAdvice = "Modal selisih set aman (+10+). Fokus kunci match.";
  if (currentPtsDiff < -10) {
    tiebreakRisk = "HIGH";
    tiebreakAdvice = `Defisit set (${currentPtsDiff}) kritis. Saat menang targetkan margin ≥+6 (10-4/10-3).`;
  } else if (currentPtsDiff < 0) {
    tiebreakRisk = "MODERATE";
    tiebreakAdvice = `Defisit set (${currentPtsDiff}). Hindari kekalahan telak (1-10/2-10).`;
  }

  // 5. THRESHOLD TARGETS
  const guaranteedTarget = remCount >= 4 ? "3–1 (Garansi 100%)" : `${remCount}–0 (100%)`;
  const survivalTarget = remCount >= 4 ? "2–2 (Peluang 54%)" : `Min 1 Win`;

  // 6. PRIMARY DECISION TAKEAWAY
  const mostCritical = tacticalMatches[0];
  const primaryDecisionTakeaway = mostCritical
    ? `Prioritas #1: Fokuskan lineup terbaik vs ${mostCritical.opponentName} (Impact tertinggi: Δ+${mostCritical.leverageImpact}%).`
    : `Fokuskan performa maksimal di sisa musim reguler.`;

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
    tiebreakRisk,
    tiebreakAdvice,
    guaranteedTarget,
    survivalTarget,
    tacticalMatches,
    primaryDecisionTakeaway,
  };
}