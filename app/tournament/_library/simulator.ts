import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface TacticalWeekMatch {
  matchId: string;
  week: number;
  opponentName: string;
  opponentLogo: string;
  opponentRank: number | string;
  opponentGroup: string;
  winProb: number;
  urgencyLevel: "DO_OR_DIE" | "CRITICAL_RIVAL" | "DAMAGE_CONTROL" | "STANDARD";
  urgencyLabel: string;
  winScenario: string;
  lossScenario: string;
  leverageSwing: number;
}

export interface PlayoffRoadmapAnalytics {
  teamName: string;
  currentWins: number;
  currentLosses: number;
  currentPtsDiff: number;
  remainingCount: number;
  quarterFinalsProb: number;
  playInsProb: number;
  eliminationProb: number;
  top2Condition: string;
  wildcardCondition: string;
  eliminationCondition: string;
  weeklyRoadmap: TacticalWeekMatch[];
}

/**
 * Model Kekuatan Tim TWI (Berdasarkan Win Rate & Efisiensi Skor Race to 10)
 */
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

/**
 * Generator skor race to 10 Duel Links yang realistis (10-0 s/d 10-9)
 */
function generateRealisticScore(winnerA: boolean) {
  const loserScore = Math.floor(Math.random() * 10);
  return winnerA ? { scoreA: 10, scoreB: loserScore } : { scoreA: loserScore, scoreB: 10 };
}

/**
 * Monte Carlo Simulation Engine untuk Playoff Roadmap
 */
export function generatePlayoffRoadmap(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 3000
): PlayoffRoadmapAnalytics {
  const cleanTarget = targetTeamName.toLowerCase().trim();
  const currentStanding = standings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

  const unfinishedMatches = allSchedules
    .filter((m) => !m.isFinished && (m.teamAName?.toLowerCase().trim() === cleanTarget || m.teamBName?.toLowerCase().trim() === cleanTarget))
    .sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));

  const remainingCount = unfinishedMatches.length;
  const currentWins = currentStanding?.matchWins || 0;
  const currentLosses = currentStanding?.matchLosses || 0;
  const currentPtsDiff = currentStanding?.roundDifference || 0;
  const maxPossibleWins = currentWins + remainingCount;

  // Trackers Monte Carlo
  let quarterWins = 0;
  let playInsWins = 0;

  // Tracking probabilitas kondisional per match ID
  const matchConditionalCounters = new Map<string, { wCount: number; wSuccess: number; lCount: number; lSuccess: number }>();
  unfinishedMatches.forEach((m) => {
    matchConditionalCounters.set(m.id, { wCount: 0, wSuccess: 0, lCount: 0, lSuccess: 0 });
  });

  // 1. Eksekusi Monte Carlo Simulasi Paralel Seluruh Jadwal Turnamen
  for (let i = 0; i < iterations; i++) {
    const simResultsPerMatch = new Map<string, boolean>();

    const simMatches: MatchScheduleItem[] = allSchedules.map((m) => {
      if (m.isFinished) return m;

      const isTargetMatch =
        m.teamAName?.toLowerCase().trim() === cleanTarget ||
        m.teamBName?.toLowerCase().trim() === cleanTarget;

      const teamAItem = standings.find((s) => s.teamName.toLowerCase().trim() === m.teamAName?.toLowerCase().trim());
      const teamBItem = standings.find((s) => s.teamName.toLowerCase().trim() === m.teamBName?.toLowerCase().trim());

      const probA = (teamAItem && teamBItem) ? calculateMatchWinProb(teamAItem, teamBItem) : 0.5;
      const wonA = Math.random() < probA;

      const { scoreA, scoreB } = generateRealisticScore(wonA);

      if (isTargetMatch) {
        const isA = m.teamAName?.toLowerCase().trim() === cleanTarget;
        const won = (isA && wonA) || (!isA && !wonA);
        simResultsPerMatch.set(m.id, won);
      }

      return { ...m, isFinished: true, scoreA, scoreB };
    });

    const simStandings = calculateStandings(simMatches, standings);
    const mySim = simStandings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

    let isQualified = false;

    if (mySim) {
      if (mySim.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
        quarterWins++;
        isQualified = true;
      } else {
        const globalStandings = buildGlobalStandings(simStandings);
        const wItem = globalStandings.find(
          (g) => !g.isTopGroup && g.teamName.toLowerCase().trim() === cleanTarget
        );
        if (wItem && wItem.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
          playInsWins++;
          isQualified = true;
        }
      }
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

  const quarterFinalsProb = remainingCount === 0 
    ? (currentStanding?.rank! <= 2 ? 100 : 0) 
    : Math.round((quarterWins / iterations) * 100);
  const playInsProb = remainingCount === 0 
    ? (currentStanding?.rank! > 2 && currentStanding?.rank! <= 8 ? 100 : 0) 
    : Math.round((playInsWins / iterations) * 100);
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  // 2. Evaluasi Kondisi Jalur Utama
  const top2Condition = maxPossibleWins >= 5
    ? `Wajib sapu bersih minimal ${Math.max(0, 5 - currentWins)} Win dari ${remainingCount} laga sisa.`
    : `Jalur tertutup matematis (Poin maksimal ${maxPossibleWins}W).`;

  const wildcardCondition = maxPossibleWins >= 3
    ? `Butuh minimal ${Math.max(0, 3 - currentWins)} Win lagi. Target aman 4-3 (+Pts Diff positif).`
    : `Jalur tertutup matematis.`;

  const maxLossAllowed = Math.max(0, maxPossibleWins - 3);
  const eliminationCondition = `Gugur 100% jika menelan ${maxLossAllowed + 1} kekalahan lagi di sisa musim.`;

  // 3. Roadmap Pekan ke Pekan
  const weeklyRoadmap: TacticalWeekMatch[] = unfinishedMatches.map((m, idx) => {
    const isA = m.teamAName?.toLowerCase().trim() === cleanTarget;
    const oppName = isA ? m.teamBName : m.teamAName;
    const oppLogo = (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp";
    const oppStanding = standings.find((s) => s.teamName.toLowerCase().trim() === oppName?.toLowerCase().trim());
    const oppRank = oppStanding?.rank ?? 99;
    const oppGroup = oppStanding?.groupName || DIVISION_MAP.GROUP_A;

    const myWinProb = currentStanding && oppStanding ? calculateMatchWinProb(currentStanding, oppStanding) : 0.5;

    const counter = matchConditionalCounters.get(m.id);
    const pW = counter && counter.wCount > 0 ? Math.round((counter.wSuccess / counter.wCount) * 100) : playInsProb;
    const pL = counter && counter.lCount > 0 ? Math.round((counter.lSuccess / counter.lCount) * 100) : 0;
    const leverageSwing = Math.max(0, pW - pL);

    const isFirstUpcoming = idx === 0;
    const isDirectRival = Math.abs((currentStanding?.rank || 8) - oppRank) <= 2;
    const isTopTier = oppRank <= 2;

    let urgencyLevel: TacticalWeekMatch["urgencyLevel"] = "STANDARD";
    let urgencyLabel = "🎯 Target Poin";
    let winScenario = `Peluang lolos naik ke ${pW}%.`;
    let lossScenario = `Peluang lolos turun ke ${pL}%.`;

    if (isFirstUpcoming && currentWins === 0) {
      urgencyLevel = "DO_OR_DIE";
      urgencyLabel = "🔥 Laga Hidup-Mati";
      winScenario = `Wajib menang telak (10-3/10-4) untuk potong defisit ${currentPtsDiff}.`;
      lossScenario = `Kekalahan membuat sisa laga berikutnya wajib menang 100%.`;
    } else if (isDirectRival) {
      urgencyLevel = "CRITICAL_RIVAL";
      urgencyLabel = "⚔️ Rival Kuota";
      winScenario = `Menang langsung memangkas rival & mengangkat kans ke ${pW}%.`;
      lossScenario = `Kalah membuat rival unggul tiebreaker; kans anjlok ke ${pL}%.`;
    } else if (isTopTier) {
      urgencyLevel = "DAMAGE_CONTROL";
      urgencyLabel = "🛡️ Lawan Papan Atas";
      winScenario = `Upset besar! Kans lolos melonjak drastis ke ${pW}%.`;
      lossScenario = `Jika tertinggal, wajib raih minimal 7-9 set (hindari kalah 1-10).`;
    } else {
      winScenario = `Kunci kemenangan untuk amankan poin menuju batas aman 3 Win.`;
      lossScenario = `Kekalahan memperkecil toleransi kesalahan di pekan terakhir.`;
    }

    return {
      matchId: m.id,
      week: m.weekNumber || (idx + 4),
      opponentName: oppName,
      opponentLogo: oppLogo,
      opponentRank: oppRank,
      opponentGroup: oppGroup,
      winProb: Math.round(myWinProb * 100),
      urgencyLevel,
      urgencyLabel,
      winScenario,
      lossScenario,
      leverageSwing,
    };
  });

  return {
    teamName: targetTeamName,
    currentWins,
    currentLosses,
    currentPtsDiff,
    remainingCount,
    quarterFinalsProb,
    playInsProb,
    eliminationProb,
    top2Condition,
    wildcardCondition,
    eliminationCondition,
    weeklyRoadmap,
  };
}