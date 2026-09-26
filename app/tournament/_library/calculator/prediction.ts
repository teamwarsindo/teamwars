import { MatchScheduleItem } from "../types";
import { getWibDateKey } from "../utils";
import { ExtendedStandingItem } from "./standings";
import { TeamComparisonStats } from "./profile";

export function calculateMatchPrediction(
  statsA: TeamComparisonStats,
  statsB: TeamComparisonStats,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = []
) {
  if (statsA.matchPlayed === 0 && statsB.matchPlayed === 0) {
    return { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 };
  }

  const baseRateA = statsA.matchPlayed > 0 ? (statsA.matchWins / statsA.matchPlayed) * 100 : 50;
  const baseRateB = statsB.matchPlayed > 0 ? (statsB.matchWins / statsB.matchPlayed) * 100 : 50;

  const diffScoreA = Math.max(0, Math.min(100, 50 + statsA.ptsDiffRate * 5));
  const diffScoreB = Math.max(0, Math.min(100, 50 + statsB.ptsDiffRate * 5));

  const computeFormScore = (form: ("W" | "L")[]) => {
    if (!form.length) return 50;
    const recent = form.slice(-4);
    const weights = [1, 1.25, 1.5, 2].slice(4 - recent.length);
    let pts = 0,
      totalW = 0;
    recent.forEach((res, i) => {
      const w = weights[i] || 1;
      totalW += w;
      if (res === "W") pts += 100 * w;
    });
    return totalW > 0 ? pts / totalW : 50;
  };

  const formScoreA = computeFormScore(statsA.form);
  const formScoreB = computeFormScore(statsB.form);

  const computeSoS = (teamName: string) => {
    if (!allSchedules.length) return 50;
    const clean = teamName.toLowerCase().trim();
    const past = allSchedules.filter(
      (m) =>
        m.isFinished &&
        (m.teamAName?.toLowerCase().trim() === clean || m.teamBName?.toLowerCase().trim() === clean)
    );
    if (!past.length) return 50;

    let totalOppWinRate = 0;
    past.forEach((m) => {
      const opp = (m.teamAName?.toLowerCase().trim() === clean ? m.teamBName : m.teamAName)?.toLowerCase().trim();
      const oppItem = standings.find((s) => s.teamName.toLowerCase().trim() === opp);
      const wr = oppItem && oppItem.matchPlayed > 0 ? (oppItem.matchWins / oppItem.matchPlayed) * 100 : 50;
      totalOppWinRate += wr;
    });
    return totalOppWinRate / past.length;
  };

  const sosA = computeSoS(statsA.teamName);
  const sosB = computeSoS(statsB.teamName);

  const directMatches = allSchedules.filter(
    (m) =>
      m.isFinished &&
      ((m.teamAName?.toLowerCase().trim() === statsA.teamName.toLowerCase().trim() &&
        m.teamBName?.toLowerCase().trim() === statsB.teamName.toLowerCase().trim()) ||
        (m.teamAName?.toLowerCase().trim() === statsB.teamName.toLowerCase().trim() &&
          m.teamBName?.toLowerCase().trim() === statsA.teamName.toLowerCase().trim()))
  );

  let h2hWinRateA = 50;
  const hasH2H = directMatches.length > 0;
  if (hasH2H) {
    let winsA = 0;
    directMatches.forEach((m) => {
      const isA = m.teamAName?.toLowerCase().trim() === statsA.teamName.toLowerCase().trim();
      const sA = Number(isA ? m.scoreA : m.scoreB) || 0;
      const sB = Number(isA ? m.scoreB : m.scoreA) || 0;
      if (sA > sB) winsA++;
    });
    h2hWinRateA = (winsA / directMatches.length) * 100;
  }

  const wWinRate = 0.4;
  const wDiff = 0.25;
  const wForm = 0.2;
  const wSos = hasH2H ? 0.05 : 0.15;
  const wH2H = hasH2H ? 0.1 : 0.0;

  const powerA =
    baseRateA * wWinRate + diffScoreA * wDiff + formScoreA * wForm + sosA * wSos + h2hWinRateA * wH2H;
  const powerB =
    baseRateB * wWinRate + diffScoreB * wDiff + formScoreB * wForm + sosB * wSos + (100 - h2hWinRateA) * wH2H;

  const total = powerA + powerB || 1;
  const rawProbA = Math.round((powerA / total) * 100);
  const probA = Math.max(15, Math.min(85, rawProbA));
  const probB = 100 - probA;

  let predScoreA = 10;
  let predScoreB = 10;
  const probDiff = Math.abs(probA - probB);

  let loserScore = 9;
  if (probDiff >= 40) {
    loserScore = Math.max(1, Math.min(4, Math.round(9 - (probDiff / 50) * 7)));
  } else if (probDiff >= 20) {
    loserScore = Math.max(4, Math.min(7, Math.round(9 - (probDiff / 40) * 4)));
  } else if (probDiff >= 8) {
    loserScore = 8;
  } else {
    loserScore = 9;
  }

  if (probA >= probB) {
    predScoreA = 10;
    predScoreB = loserScore;
  } else {
    predScoreA = loserScore;
    predScoreB = 10;
  }

  return { probA, probB, predScoreA, predScoreB };
}

export function getNextDateMatches(currentWeekSchedules: MatchScheduleItem[], todayDateStrWIB: string) {
  const candidates = currentWeekSchedules
    .filter((m) => !m.isFinished && m.matchDate && getWibDateKey(new Date(m.matchDate)) > todayDateStrWIB)
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  if (!candidates.length) return [];
  const nextDate = getWibDateKey(new Date(candidates[0].matchDate));
  return candidates.filter((m) => getWibDateKey(new Date(m.matchDate)) === nextDate);
}
