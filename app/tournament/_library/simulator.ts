import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface ScenarioOutcome {
  wins: number;
  losses: number;
  recordLabel: string;
  quarterProb: number;
  playInsProb: number;
  statusBadge: "SAFE" | "COMPETITIVE" | "CRITICAL" | "DEAD";
}

export interface CriticalMatchItem {
  matchId: string;
  opponentName: string;
  opponentLogo: string;
  opponentRank: number | string;
  importance: "CRITICAL_SWING" | "DIRECT_RIVAL" | "UPSET_CHANCE";
  reason: string;
}

export interface FullPlayoffAnalyticsResult {
  teamName: string;
  currentWins: number;
  currentLosses: number;
  currentPtsDiff: number;
  remainingMatchesCount: number;
  sosRating: number;           // 0 - 100 (Kekuatan sisa lawan)
  sosLabel: "Ringan" | "Moderat" | "Berat";
  quarterFinalsProb: number;
  playInsProb: number;
  eliminationProb: number;
  safeWinsThreshold: number;   // Target win aman
  minWinsThreshold: number;    // Target win minimal
  isGuaranteedEliminated: boolean;
  criticalMatches: CriticalMatchItem[];
  scenarios: ScenarioOutcome[];
  tacticalSummary: string[];
}

export function generateFullPlayoffAnalytics(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 3000
): FullPlayoffAnalyticsResult {
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
  const maxPossibleWins = currentWins + remCount;

  // 1. HITUNG STRENGTH OF SCHEDULE (SoS)
  let totalOppWinRate = 0;
  const criticalMatches: CriticalMatchItem[] = [];

  myRemainingMatches.forEach((m) => {
    const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
    const oppName = isA ? m.teamBName : m.teamAName;
    const oppLogo = (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp";
    const oppStanding = standings.find((s) => s.teamName.toLowerCase().trim() === oppName.toLowerCase().trim());
    
    const oppWinRate = oppStanding && oppStanding.matchPlayed > 0 
      ? (oppStanding.matchWins / oppStanding.matchPlayed) * 100 
      : 50;
    totalOppWinRate += oppWinRate;

    // Deteksi Laga Kunci (🔥 Six-Point Swing)
    const oppRank = oppStanding?.rank ?? 99;
    const isSameGroup = oppStanding?.groupName === currentStanding?.groupName;
    
    let importance: CriticalMatchItem["importance"] = "DIRECT_RIVAL";
    let reason = "Pesaing langsung perebutan tiket";

    if (oppRank <= 2 && isSameGroup) {
      importance = "UPSET_CHANCE";
      reason = "Peluang pangkas selisih ke Top 2 Divisi";
    } else if (Math.abs((currentStanding?.rank || 5) - oppRank) <= 2) {
      importance = "CRITICAL_SWING";
      reason = "🔥 6-Point Swing: Menang menekan rival langsung ke bawah";
    }

    criticalMatches.push({
      matchId: m.id,
      opponentName: oppName,
      opponentLogo: oppLogo,
      opponentRank: oppRank,
      importance,
      reason,
    });
  });

  const rawSos = remCount > 0 ? Math.round(totalOppWinRate / remCount) : 50;
  const sosRating = Math.max(10, Math.min(95, rawSos));
  const sosLabel = sosRating >= 65 ? "Berat" : sosRating <= 40 ? "Ringan" : "Moderat";

  // 2. SIMULASI MONTE CARLO (3.000 Iterasi Musim Paralel)
  let quarterWins = 0;
  let playInsWins = 0;
  let eliminatedCount = 0;

  // Matriks skenario hasil (misal sisa 4 laga: 4-0, 3-1, 2-2, 1-3, 0-4)
  const scenarioStats = new Map<number, { count: number; qWins: number; pWins: number }>();
  for (let w = 0; w <= remCount; w++) {
    scenarioStats.set(w, { count: 0, qWins: 0, pWins: 0 });
  }

  for (let i = 0; i < iterations; i++) {
    let mySimWins = 0;

    const simMatches: MatchScheduleItem[] = allSchedules.map((m) => {
      if (m.isFinished) return m;

      const isTargetMatch =
        m.teamAName.toLowerCase().trim() === cleanTarget ||
        m.teamBName.toLowerCase().trim() === cleanTarget;

      const rand = Math.random();
      let scoreA = 10;
      let scoreB = Math.floor(Math.random() * 6) + 3;

      if (rand < 0.5) {
        scoreA = scoreB;
        scoreB = 10;
      }

      if (isTargetMatch) {
        const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
        if ((isA && scoreA > scoreB) || (!isA && scoreB > scoreA)) {
          mySimWins++;
        }
      }

      return { ...m, isFinished: true, scoreA, scoreB };
    });

    const simStandings = calculateStandings(simMatches, standings);
    const mySim = simStandings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

    let isQ = false;
    let isP = false;

    if (mySim) {
      if (mySim.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
        quarterWins++;
        isQ = true;
      } else {
        const globalStandings = buildGlobalStandings(simStandings);
        const wItem = globalStandings.find(
          (g) => !g.isTopGroup && g.teamName.toLowerCase().trim() === cleanTarget
        );
        if (wItem && wItem.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
          playInsWins++;
          isP = true;
        } else {
          eliminatedCount++;
        }
      }
    }

    const stat = scenarioStats.get(mySimWins);
    if (stat) {
      stat.count++;
      if (isQ) stat.qWins++;
      if (isP) stat.pWins++;
    }
  }

  const quarterFinalsProb = remCount === 0 ? (currentStanding?.rank! <= 2 ? 100 : 0) : Math.round((quarterWins / iterations) * 100);
  const playInsProb = remCount === 0 ? (currentStanding?.rank! > 2 && currentStanding?.rank! <= 8 ? 100 : 0) : Math.round((playInsWins / iterations) * 100);
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  // 3. GENERATE SCENARIO MATRIX (WHAT-IF DASHBOARD)
  const scenarios: ScenarioOutcome[] = [];
  for (let w = remCount; w >= 0; w--) {
    const s = scenarioStats.get(w);
    const total = s?.count || 1;
    const qP = Math.round(((s?.qWins || 0) / total) * 100);
    const pP = Math.round(((s?.pWins || 0) / total) * 100);
    
    let statusBadge: ScenarioOutcome["statusBadge"] = "DEAD";
    if (qP + pP >= 90) statusBadge = "SAFE";
    else if (qP + pP >= 60) statusBadge = "COMPETITIVE";
    else if (qP + pP >= 20) statusBadge = "CRITICAL";

    scenarios.push({
      wins: w,
      losses: remCount - w,
      recordLabel: `${w}-${remCount - w}`,
      quarterProb: qP,
      playInsProb: pP,
      statusBadge,
    });
  }

  // 4. REKOMENDASI TAKTIS & THRESHOLD
  const safeWinsThreshold = Math.min(remCount, Math.max(0, 4 - currentWins));
  const minWinsThreshold = Math.min(remCount, Math.max(0, 3 - currentWins));
  const isGuaranteedEliminated = maxPossibleWins < 3;

  const tacticalSummary: string[] = [];
  if (currentWins >= 3) {
    tacticalSummary.push(`Jalur Utama: Mengamankan Top 2 Divisi. Butuh ${Math.max(0, 5 - currentWins)} kemenangan untuk tiket Quarterfinal langsung.`);
    tacticalSummary.push(`Amankan margin skor set (+${currentPtsDiff}) untuk mengunci posisi seeding bagan atas.`);
  } else if (currentWins === 0) {
    tacticalSummary.push(`Batas Toleransi: Maksimal hanya boleh kalah ${Math.max(0, remCount - 3)} match lagi. Menelan ${Math.max(0, remCount - 3) + 1} kekalahan memastikan gugur 100%.`);
    tacticalSummary.push(`Prioritaskan kemenangan telak (10-3 atau 10-4) pada laga kunci melawan sesama tim papan tengah.`);
  } else {
    tacticalSummary.push(`Jalur Realistis: Targetkan minimal rekor akhir 4-3 (butuh ${Math.max(0, 4 - currentWins)} Win lagi) untuk kepastian lolos Play-Ins 90%+.`);
    tacticalSummary.push(`Fokus amankan kemenangan di laga 6-Point Swing sebelum menghadapi pemuncak klasemen.`);
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
    safeWinsThreshold,
    minWinsThreshold,
    isGuaranteedEliminated,
    criticalMatches,
    scenarios,
    tacticalSummary,
  };
}