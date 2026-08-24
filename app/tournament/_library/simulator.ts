import { MatchScheduleItem } from "./types";
import { ExtendedStandingItem } from "./calculator";

export interface TacticalWeekMatch {
  matchId: string;
  week: number;
  opponentName: string;
  opponentLogo: string;
  opponentRank: number | string;
  urgencyLevel: "DO_OR_DIE" | "CRITICAL_RIVAL" | "DAMAGE_CONTROL" | "STANDARD";
  urgencyLabel: string;
  targetInstruction: string;
}

export interface PlayoffRoadmapAnalytics {
  teamName: string;
  currentWins: number;
  currentLosses: number;
  currentPtsDiff: number;
  currentPtsScored: number;
  remainingCount: number;
  quarterFinalsProb: number;
  playInsProb: number;
  eliminationProb: number;
  targetGuaranteed: string;
  targetCutoff: string;
  eliminationRule: string;
  weeklyRoadmap: TacticalWeekMatch[];
  operationalInstruction: string;
}

export function generatePlayoffRoadmap(
  targetTeamName: string,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = []
): PlayoffRoadmapAnalytics {
  const cleanTarget = targetTeamName.toLowerCase().trim();
  const currentStanding = standings.find((s) => s.teamName.toLowerCase().trim() === cleanTarget);

  const unfinishedMatches = allSchedules
    .filter(
      (m) =>
        !m.isFinished &&
        (m.teamAName.toLowerCase().trim() === cleanTarget ||
          m.teamBName.toLowerCase().trim() === cleanTarget)
    )
    .sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));

  const remainingCount = unfinishedMatches.length;
  const currentWins = currentStanding?.matchWins || 0;
  const currentLosses = currentStanding?.matchLosses || 0;
  const currentPtsDiff = currentStanding?.roundDifference || 0;
  const currentPtsScored = currentStanding?.setWins || 0;
  const maxPossibleWins = currentWins + remainingCount;

  // 1. Syarat Matematis Kelolosan
  const targetGuaranteed = remainingCount >= 4 ? "4-0 (Lolos Mutlak)" : `${remainingCount}-0 (100%)`;
  const targetCutoff = remainingCount >= 4 ? "3-1 (Wajib Pts Diff ≥ +6)" : "Min. 3 Match Wins";
  const eliminationRule = "Maksimal 1x Match Lose lagi. Jika 2x Lose = Pasti Gugur.";

  // 2. Roadmap Per Pekan (Week 4 s/d Week 7)
  const weeklyRoadmap: TacticalWeekMatch[] = unfinishedMatches.map((m, idx) => {
    const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
    const oppName = isA ? m.teamBName : m.teamAName;
    const oppLogo = (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp";
    const oppStanding = standings.find((s) => s.teamName.toLowerCase().trim() === oppName.toLowerCase().trim());
    const oppRank = oppStanding?.rank ?? 99;

    const isFirstUpcoming = idx === 0;
    const isDirectRival = Math.abs((currentStanding?.rank || 8) - oppRank) <= 2;
    const isTopTier = oppRank <= 2;

    let urgencyLevel: TacticalWeekMatch["urgencyLevel"] = "STANDARD";
    let urgencyLabel = "Target Win";
    let targetInstruction = "Menang skor 10-0 s/d 10-4";

    if (isFirstUpcoming && currentWins === 0) {
      urgencyLevel = "DO_OR_DIE";
      urgencyLabel = "🔥 Laga Kunci";
      targetInstruction = "Wajib 10-0 s/d 10-4 (Pts Diff ≥ +6)";
    } else if (isTopTier) {
      urgencyLevel = "DAMAGE_CONTROL";
      urgencyLabel = "🛡️ Papan Atas";
      targetInstruction = "Kejar Win / Amankan Pts Scored ≥ 7";
    } else if (isDirectRival) {
      urgencyLevel = "CRITICAL_RIVAL";
      urgencyLabel = "⚔️ Rival Kuota";
      targetInstruction = "Wajib Menang (Kunci Pts Diff)";
    } else {
      urgencyLevel = "STANDARD";
      urgencyLabel = "🎯 Target Win";
      targetInstruction = "Menang skor 10-0 s/d 10-4";
    }

    return {
      matchId: m.id,
      week: m.weekNumber || (idx + 4),
      opponentName: oppName,
      opponentLogo: oppLogo,
      opponentRank: oppRank,
      urgencyLevel,
      urgencyLabel,
      targetInstruction,
    };
  });

  // 3. Probabilitas
  const quarterFinalsProb = maxPossibleWins < 5 ? 0 : currentWins >= 3 ? 65 : 10;
  const playInsProb =
    maxPossibleWins < 3 ? 0 : currentWins === 0 ? 13 : currentWins === 1 ? 40 : currentWins === 2 ? 75 : 95;
  const eliminationProb = Math.max(0, 100 - (quarterFinalsProb + playInsProb));

  // 4. Instruksi Operasional Tunggal & Lugas
  const operationalInstruction =
    currentWins === 0
      ? `Jatah kalah maksimal 1x. Wajib raih minimal 3 Match Wins dengan skor 10-0 s/d 10-4 (Pts Diff ≥ +6 per match) untuk memulihkan Pts Diff ${currentPtsDiff}.`
      : `Amankan minimal 2 Match Wins lagi dan pertahankan Pts Diff positif untuk mengunci posisi Top 8.`;

  return {
    teamName: targetTeamName,
    currentWins,
    currentLosses,
    currentPtsDiff,
    currentPtsScored,
    remainingCount,
    quarterFinalsProb,
    playInsProb,
    eliminationProb,
    targetGuaranteed,
    targetCutoff,
    eliminationRule,
    weeklyRoadmap,
    operationalInstruction,
  };
        }
