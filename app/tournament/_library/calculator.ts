import { MatchScheduleItem, TOURNAMENT_RULES } from "@/app/tournament/_library";

export interface QualificationStatus {
  rankLabel: string;
  stageLabel: string;
  isQualified: boolean;
}

export interface ExtendedStandingItem {
  teamName: string;
  teamColor?: string;
  teamLogo?: string;
  groupName?: string;
  rank: number;
  played: number;
  won: number;
  lost: number;
  winRate: number;
  setWins: number;
  setLosses: number;
  rawDiff: number;
  roundDifference: string;
  ptsDiffRate?: number;
  ptsDiffRateLabel?: string;
  points: number;
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
 * 1. Menghitung Klasemen per Grup / Keseluruhan
 */
export function calculateStandings(
  schedules: MatchScheduleItem[],
  groupFilter?: string
): ExtendedStandingItem[] {
  const filtered = groupFilter
    ? schedules.filter((s) => s.groupName?.toLowerCase() === groupFilter.toLowerCase())
    : schedules;

  const teamMap = new Map<string, {
    teamName: string;
    teamColor?: string;
    teamLogo?: string;
    groupName?: string;
    played: number;
    won: number;
    lost: number;
    setWins: number;
    setLosses: number;
    points: number;
    form: ("W" | "L")[];
  }>();

  // Pastikan urut kronologis untuk kalkulasi form laga
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  sorted.forEach((m) => {
    if (!m.teamAName || !m.teamBName) return;

    if (!teamMap.has(m.teamAName)) {
      teamMap.set(m.teamAName, {
        teamName: m.teamAName,
        teamColor: m.teamAColor,
        teamLogo: m.teamALogo,
        groupName: m.groupName,
        played: 0,
        won: 0,
        lost: 0,
        setWins: 0,
        setLosses: 0,
        points: 0,
        form: [],
      });
    }
    if (!teamMap.has(m.teamBName)) {
      teamMap.set(m.teamBName, {
        teamName: m.teamBName,
        teamColor: m.teamBColor,
        teamLogo: m.teamBLogo,
        groupName: m.groupName,
        played: 0,
        won: 0,
        lost: 0,
        setWins: 0,
        setLosses: 0,
        points: 0,
        form: [],
      });
    }

    const isFinished =
      Boolean(m.isFinished) ||
      ((Number(m.scoreA) || 0) + (Number(m.scoreB) || 0) > 0 && m.isFinished !== false);

    if (isFinished) {
      const sA = Number(m.scoreA) || 0;
      const sB = Number(m.scoreB) || 0;
      const tA = teamMap.get(m.teamAName)!;
      const tB = teamMap.get(m.teamBName)!;

      tA.played += 1;
      tB.played += 1;
      tA.setWins += sA;
      tA.setLosses += sB;
      tB.setWins += sB;
      tB.setLosses += sA;

      if (sA > sB) {
        tA.won += 1;
        tA.points += 3;
        tA.form.push("W");
        tB.lost += 1;
        tB.form.push("L");
      } else if (sB > sA) {
        tB.won += 1;
        tB.points += 3;
        tB.form.push("W");
        tA.lost += 1;
        tA.form.push("L");
      }
    }
  });

  const list = Array.from(teamMap.values()).map((t) => {
    const rawDiff = t.setWins - t.setLosses;
    const diffSign = rawDiff > 0 ? `+${rawDiff}` : `${rawDiff}`;
    const winRate = t.played > 0 ? Math.round((t.won / t.played) * 100) : 0;
    const ptsDiffRate = t.played > 0 ? Number((rawDiff / t.played).toFixed(1)) : 0;
    const ptsDiffRateLabel = ptsDiffRate > 0 ? `+${ptsDiffRate}` : `${ptsDiffRate}`;

    return {
      ...t,
      rank: 0,
      winRate,
      rawDiff,
      roundDifference: diffSign,
      ptsDiffRate,
      ptsDiffRateLabel,
      qualification: { rankLabel: "-", stageLabel: "-", isQualified: false },
    };
  });

  // Sorting aturan standar: Points -> RawDiff -> SetWins -> WinRate
  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.rawDiff !== a.rawDiff) return b.rawDiff - a.rawDiff;
    if (b.setWins !== a.setWins) return b.setWins - a.setWins;
    return b.winRate - a.winRate;
  });

  return list.map((item, idx) => {
    const rank = idx + 1;
    const isGroupTop = rank <= 4;
    return {
      ...item,
      rank,
      qualification: {
        rankLabel: `#${rank} ${item.groupName || "Group"}`,
        stageLabel: isGroupTop ? "Quarter" : "Play-Ins",
        isQualified: isGroupTop,
      },
    };
  });
}

/**
 * 2. Membangun Klasemen Global (Seluruh Grup)
 */
export function buildGlobalStandings(schedules: MatchScheduleItem[]): ExtendedStandingItem[] {
  return calculateStandings(schedules);
}

/**
 * 3. Mengambil Pertandingan pada Tanggal Berikutnya
 */
export function getNextDateMatches(schedules: MatchScheduleItem[]): MatchScheduleItem[] {
  const unfinished = schedules.filter((m) => !m.isFinished);
  if (unfinished.length === 0) return [];

  const sorted = [...unfinished].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );

  const nextDateKey = sorted[0]?.matchDate ? new Date(sorted[0].matchDate).toDateString() : null;
  if (!nextDateKey) return [];

  return sorted.filter((m) => new Date(m.matchDate).toDateString() === nextDateKey);
}

/**
 * 4. Helper Mengambil Statistik Tim dari Standings
 */
export function getTeamStatsFromStandings(
  teamName: string,
  standings: ExtendedStandingItem[] = [],
  fallbackColor?: string
): ExtendedStandingItem {
  const found = standings.find(
    (s) => s.teamName.trim().toLowerCase() === teamName.trim().toLowerCase()
  );

  if (found) {
    return {
      ...found,
      teamColor: found.teamColor || fallbackColor || "#3B82F6",
    };
  }

  return {
    teamName,
    teamColor: fallbackColor || "#3B82F6",
    rank: 0,
    played: 0,
    won: 0,
    lost: 0,
    winRate: 0,
    setWins: 0,
    setLosses: 0,
    rawDiff: 0,
    roundDifference: "0",
    ptsDiffRate: 0,
    ptsDiffRateLabel: "0",
    points: 0,
    form: [],
    qualification: { rankLabel: "Unranked", stageLabel: "Play-Ins", isQualified: false },
  };
}

/**
 * 5. Helper Memetakan Riwayat Tiap Pekan untuk Satu Tim
 */
export function getTeamHistoryMap(
  teamName: string,
  allSchedules: MatchScheduleItem[] = []
): Map<number, MatchHistoryCardItem> {
  const map = new Map<number, MatchHistoryCardItem>();

  allSchedules.forEach((m) => {
    const isFinished =
      Boolean(m.isFinished) ||
      ((Number(m.scoreA) || 0) + (Number(m.scoreB) || 0) > 0 && m.isFinished !== false);

    if (!isFinished) return;

    const isA = m.teamAName.trim().toLowerCase() === teamName.trim().toLowerCase();
    const isB = m.teamBName.trim().toLowerCase() === teamName.trim().toLowerCase();

    if (!isA && !isB) return;

    const week = m.weekNumber || 1;
    const sA = Number(m.scoreA) || 0;
    const sB = Number(m.scoreB) || 0;

    map.set(week, {
      week,
      oppName: isA ? m.teamBName : m.teamAName,
      oppLogo: (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp",
      isWin: isA ? sA > sB : sB > sA,
      myScore: isA ? sA : sB,
      oppScore: isA ? sB : sA,
      reportLink: m.maskedImageUrl || m.reportImageUrl,
    });
  });

  return map;
}

/**
 * 6. Strength of Schedule (SoS)
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

  if (pastMatches.length === 0) return 50;

  let totalOppWinRate = 0;
  for (const m of pastMatches) {
    const oppName = m.teamAName === teamName ? m.teamBName : m.teamAName;
    const oppData = standingsMap.get(oppName);
    totalOppWinRate += oppData ? Number(oppData.winRate) || 0 : 50;
  }

  return totalOppWinRate / pastMatches.length;
}

/**
 * 7. Weighted Form Decay
 */
export function calculateWeightedFormScore(formList: ("W" | "L")[]): number {
  if (!formList || formList.length === 0) return 50;

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
 * 8. Direct Head-to-Head Win Rate
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
 * 9. Prediksi Pertandingan Multi-Variabel
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

  const baseRateA = Number(statsA.winRate) || 0;
  const baseRateB = Number(statsB.winRate) || 0;

  const sosA = calculateStrengthOfSchedule(statsA.teamName, allSchedules, standingsMap);
  const sosB = calculateStrengthOfSchedule(statsB.teamName, allSchedules, standingsMap);

  const formScoreA = calculateWeightedFormScore(statsA.form || []);
  const formScoreB = calculateWeightedFormScore(statsB.form || []);

  const h2h = calculateDirectH2HWinRate(statsA.teamName, statsB.teamName, allSchedules);

  const wBase = 0.3;
  const wSos = h2h.hasPlayed ? 0.35 : 0.5;
  const wForm = 0.2;
  const wH2H = h2h.hasPlayed ? 0.15 : 0.0;

  const powerA = baseRateA * wBase + sosA * wSos + formScoreA * wForm + h2h.winRateA * wH2H;
  const powerB = baseRateB * wBase + sosB * wSos + formScoreB * wForm + (100 - h2h.winRateA) * wH2H;

  const totalPower = powerA + powerB || 1;
  const rawProbA = Math.round((powerA / totalPower) * 100);
  const probA = Math.min(85, Math.max(15, rawProbA));
  const probB = 100 - probA;

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
  
