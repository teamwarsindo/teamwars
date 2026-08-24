import { MatchScheduleItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { ExtendedStandingItem, calculateStandings, buildGlobalStandings } from "./calculator";

export interface PlayoffProbabilityResult {
  teamName: string;
  quarterFinalsProb: number;
  playInsProb: number;
  eliminationProb: number;
  remainingMatchesCount: number;
  targetQuarterWins: number;
  targetPlayInsWins: number;
  maxLossesAllowed: number;
  projectedRankRange: string;
  statusRisk: "HIGH" | "MEDIUM" | "SAFE";
  tacticalAdvice: string[];
}

export function simulateTeamPlayoffStrategy(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = [],
  iterations: number = 2000
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
      quarterFinalsProb: isTopDiv ? 100 : 0,
      playInsProb: isPlayIns ? 100 : 0,
      eliminationProb: !isTopDiv && !isPlayIns ? 100 : 0,
      remainingMatchesCount: 0,
      targetQuarterWins: 0,
      targetPlayInsWins: 0,
      maxLossesAllowed: 0,
      projectedRankRange: isTopDiv ? "Quarterfinal" : isPlayIns ? "Play-Ins" : "Eliminasi",
      statusRisk: isTopDiv || isPlayIns ? "SAFE" : "HIGH",
      tacticalAdvice: ["Seluruh pertandingan musim reguler telah selesai."],
    };
  }

  const currentWins = currentStanding.matchWins || 0;
  const currentLosses = currentStanding.matchLosses || 0;
  const maxPossibleWins = currentWins + remCount;

  // Standar target matematis (Total 7 Match):
  // 5 Win = Kunci Top 2 Divisi (Quarterfinal)
  // 4 Win = Sangat Aman Play-Ins
  // 3 Win = Minimal Rebutan Play-Ins (Cutoff Rank 8)
  const targetQuarterWins = Math.max(0, 5 - currentWins);
  const targetPlayInsWins = Math.max(0, 3 - currentWins);
  const maxLossesAllowed = Math.max(0, maxPossibleWins - 3);

  let quarterWins = 0;
  let playInsWins = 0;
  let eliminatedCount = 0;

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

  let projectedRankRange = "Rank #5 - #8 (Play-Ins)";
  if (quarterFinalsProb >= 60) {
    projectedRankRange = "Top 2 Divisi (Quarter)";
  } else if (eliminationProb >= 60) {
    projectedRankRange = "Rank #9 - #12 (Eliminasi)";
  }

  let statusRisk: "HIGH" | "MEDIUM" | "SAFE" = "MEDIUM";
  if (eliminationProb >= 50) statusRisk = "HIGH";
  else if (quarterFinalsProb >= 60 || quarterFinalsProb + playInsProb >= 85) statusRisk = "SAFE";

  const tacticalAdvice: string[] = [];

  // Strategi Taktis Presisi Sesuai Posisi Klasemen
  if (currentWins >= 3) {
    tacticalAdvice.push(
      `Kunci Quarterfinal: Butuh ${targetQuarterWins} Win dari ${remCount} laga sisa untuk mengamankan tiket 8 Besar langsung tanpa lewat Play-Ins.`
    );
    tacticalAdvice.push(
      `Keunggulan Poin: Pertahankan selisih skor (+${currentStanding.roundDifference}) agar tetap unggul head-to-head saat penentuan bagan seeding.`
    );
  } else if (currentWins === 0) {
    tacticalAdvice.push(
      `Batas Eliminasi: Maksimal hanya boleh kalah ${maxLossesAllowed} kali lagi. Menelan ${maxLossesAllowed + 1} kekalahan memastikan tim 100% gugur.`
    );
    tacticalAdvice.push(
      `Fokus Perbaikan Poin: Selisih poin (${currentStanding.roundDifference}) berada di zona defisit. Jika tertinggal dalam match, wajib amankan minimal 6-8 set kemenangan.`
    );
  } else {
    tacticalAdvice.push(
      `Jalur Play-Ins: Butuh minimal ${targetPlayInsWins} Win lagi untuk mengamankan posisi 8 Besar Wildcard.`
    );
    tacticalAdvice.push(
      `Toleransi Kalah: Memiliki ruang toleransi ${maxLossesAllowed} kekalahan di sisa musim reguler.`
    );
  }

  return {
    teamName: targetTeamName,
    quarterFinalsProb,
    playInsProb,
    eliminationProb,
    remainingMatchesCount: remCount,
    targetQuarterWins,
    targetPlayInsWins,
    maxLossesAllowed,
    projectedRankRange,
    statusRisk,
    tacticalAdvice,
  };
}