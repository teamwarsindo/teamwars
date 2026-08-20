import { MatchScheduleItem } from "./types"; // Sesuaikan path import type project

export interface QualificationStatus {
  rankLabel: string;
  stageLabel: string;
  isQualified: boolean;
}

export interface ExtendedStandingItem {
  teamName: string;
  rank: number;
  winRate: number;
  rawDiff: number;
  roundDifference: string;
  setWins: number;
  form: ("W" | "L")[];
  qualification: QualificationStatus;
}

export interface MatchHistoryCardItem {
  week: number;
  oppName: string;
  oppLogo: string;
  isWin: boolean;
  myScore: number;
  oppScore: number;
  reportLink?: string;
}

/**
 * Menghitung Strength of Schedule (SoS) - Rata-rata Win Rate tim lawan yang pernah dihadapi
 */
export function calculateStrengthOfSchedule(
  teamName: string,
  allSchedules: MatchScheduleItem[],
  standingsMap: Map<string, ExtendedStandingItem>
): number {
  const pastMatches = allSchedules.filter(
    (m) =>
      m.isFinished &&
      (m.teamAName === teamName || m.teamBName === teamName)
  );

  if (pastMatches.length === 0) return 50; // Nilai default netral

  let totalOppWinRate = 0;
  for (const m of pastMatches) {
    const oppName = m.teamAName === teamName ? m.teamBName : m.teamAName;
    const oppData = standingsMap.get(oppName);
    totalOppWinRate += oppData ? Number(oppData.winRate) || 0 : 50;
  }

  return totalOppWinRate / pastMatches.length;
}

/**
 * Menghitung skor momentum form laga dengan bobot time-decay (laga terbaru berbobot lebih tinggi)
 */
export function calculateWeightedFormScore(formList: ("W" | "L")[]): number {
  if (!formList || formList.length === 0) return 50;
  
  // Ambil hingga 4 laga terakhir
  const recent = formList.slice(-4);
  const weights = [1, 1.25, 1.5, 2].slice(4 - recent.length);
  
  let weightedPoints = 0;
  let totalWeight = 0;

  recent.forEach((res, i) => {
    const w = weights[i] || 1;
    totalWeight += w;
    if (res === "W") weightedPoints += 100 * w;
  });

  return totalWeight > 0 ? weightedPoints / totalWeight : 50;
}

/**
 * Menghitung rekor Head-to-Head langsung antara Tim A vs Tim B dari jadwal masa lalu
 */
export function calculateDirectH2HWinRate(
  teamAName: string,
  teamBName: string,
  allSchedules: MatchScheduleItem[]
): { winRateA: number; hasPlayed: boolean } {
  const directMatches = allSchedules.filter(
    (m) =>
      m.isFinished &&
      ((m.teamAName === teamAName && m.teamBName === teamBName) ||
        (m.teamAName === teamBName && m.teamBName === teamAName))
  );

  if (directMatches.length === 0) return { winRateA: 50, hasPlayed: false };

  let winsA = 0;
  directMatches.forEach((m) => {
    const sA = Number(m.scoreA) || 0;
    const sB = Number(m.scoreB) || 0;
    if (m.teamAName === teamAName && sA > sB) winsA++;
    if (m.teamBName === teamAName && sB > sA) winsA++;
  });

  return {
    winRateA: (winsA / directMatches.length) * 100,
    hasPlayed: true,
  };
}

/**
 * Prediksi Lengkap Berbasis Data Multi-Variabel
 * (Base Strength + Strength of Schedule + Momentum Form + Direct H2H)
 */
export function calculateMatchPrediction(
  statsA: ExtendedStandingItem,
  statsB: ExtendedStandingItem,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = []
) {
  const standingsMap = new Map<string, ExtendedStandingItem>(
    standings.map((s) => [s.teamName, s])
  );

  // 1. Pilar Data
  const baseRateA = Number(statsA.winRate) || 0;
  const baseRateB = Number(statsB.winRate) || 0;

  const sosA = calculateStrengthOfSchedule(statsA.teamName, allSchedules, standingsMap);
  const sosB = calculateStrengthOfSchedule(statsB.teamName, allSchedules, standingsMap);

  const formScoreA = calculateWeightedFormScore(statsA.form || []);
  const formScoreB = calculateWeightedFormScore(statsB.form || []);

  const h2h = calculateDirectH2HWinRate(statsA.teamName, statsB.teamName, allSchedules);

  // 2. Power Rating Index (Total 100%)
  // Jika belum pernah H2H, bobot 15% dialihkan ke Strength of Schedule
  const wBase = 0.3;
  const wSos = h2h.hasPlayed ? 0.35 : 0.5;
  const wForm = 0.2;
  const wH2H = h2h.hasPlayed ? 0.15 : 0.0;

  const powerA =
    baseRateA * wBase +
    sosA * wSos +
    formScoreA * wForm +
    h2h.winRateA * wH2H;

  const powerB =
    baseRateB * wBase +
    sosB * wSos +
    formScoreB * wForm +
    (100 - h2h.winRateA) * wH2H;

  // 3. Normalisasi Probabilitas (Clamp minimum 15% - maksimum 85%)
  const totalPower = powerA + powerB || 1;
  const rawProbA = Math.round((powerA / totalPower) * 100);
  const probA = Math.min(85, Math.max(15, rawProbA));
  const probB = 100 - probA;

  // 4. Prediksi Skor Target Format Best-of-19 (10 Poin Menang)
  let predScoreA = 10;
  let predScoreB = 10;

  if (probA >= probB) {
    predScoreA = 10;
    predScoreB = Math.max(0, Math.min(9, Math.round((probB / probA) * 10)));
  } else {
    predScoreB = 10;
    predScoreA = Math.max(0, Math.min(9, Math.round((probA / probB) * 10)));
  }

  return { probA, probB, predScoreA, predScoreB };                   
}
