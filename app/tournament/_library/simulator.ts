import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface PlayoffProbabilityResult {
  teamName: string;
  totalSimulations: number;
  quarterFinalsProb: number; // % Lolos Top 2 Grup
  playInsProb: number;        // % Lolos Top 8 Wildcard
  eliminationProb: number;    // % Risiko Tersingkir
  remainingMatchesCount: number;
  magicWinsNeeded: number;    // Target Win minimal
  statusRisk: "HIGH" | "MEDIUM" | "SAFE";
  tacticalAdvice: string[];
}

/**
 * Monte Carlo Simulation Engine untuk memprediksi kelolosan Playoff & Play-Ins
 */
export function simulateTeamPlayoffStrategy(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 1000
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
      statusRisk: isTopDiv || isPlayIns ? "SAFE" : "HIGH",
      tacticalAdvice: ["Seluruh pertandingan musim reguler telah selesai."],
    };
  }

  let quarterWins = 0;
  let playInsWins = 0;
  let eliminatedCount = 0;

  // Jalankan iterasi Monte Carlo
  for (let i = 0; i < iterations; i++) {
    const simMatches: MatchScheduleItem[] = allSchedules.map((m) => {
      if (m.isFinished) return m;

      // Simulasi hasil match yang belum selesai
      const rand = Math.random();
      const isTargetMatch =
        m.teamAName.toLowerCase().trim() === cleanTarget ||
        m.teamBName.toLowerCase().trim() === cleanTarget;

      let scoreA = 10;
      let scoreB = Math.floor(Math.random() * 6) + 3; // skor 3-8

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
      } else {
        const globalStandings = buildGlobalStandings(simStandings);
        const wItem = globalStandings.find(
          (g) => !g.isTopGroup && g.teamName.toLowerCase().trim() === cleanTarget
        );
        if (wItem && wItem.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
          playInsWins++;
        } else {
          eliminatedCount++;
        }
      }
    }
  }

  const quarterFinalsProb = Math.round((quarterWins / iterations) * 100);
  const playInsProb = Math.round((playInsWins / iterations) * 100);
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  // Magic requirement rule
  const currentWins = currentStanding.matchWins || 0;
  const magicWinsNeeded = Math.max(0, 4 - currentWins);

  let statusRisk: "HIGH" | "MEDIUM" | "SAFE" = "MEDIUM";
  if (eliminationProb > 45) statusRisk = "HIGH";
  else if (quarterFinalsProb + playInsProb > 80) statusRisk = "SAFE";

  // Taktik otomatis
  const tacticalAdvice: string[] = [];
  if (currentWins === 0) {
    tacticalAdvice.push(
      `Wajib memenangkan minimal ${Math.min(remCount, 3)} dari ${remCount} match tersisa untuk menjaga peluang Play-Ins.`
    );
    if (currentStanding.roundDifference < 0) {
      tacticalAdvice.push(
        `Defisit poin (${currentStanding.roundDifference}) sangat rentan. Maksimalkan margin skor (10-3 atau 10-4) pada kemenangan berikutnya.`
      );
    }
  } else if (statusRisk === "SAFE") {
    tacticalAdvice.push(
      `Posisi klasemen sangat kuat. Raih 1–2 kemenangan lagi untuk mengunci tiket Quarterfinal.`
    );
  } else {
    tacticalAdvice.push(
      `Peluang Play-Ins sebesar ${playInsProb}%. Fokuskan kemenangan langsung saat menghadapi rival di papan tengah.`
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
    statusRisk,
    tacticalAdvice,
  };
        }
