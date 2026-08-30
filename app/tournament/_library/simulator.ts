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
  targetTitle: string;
  targetPrimary: string;
  targetSecondary: string;
  eliminationTitle: string;
  eliminationPrimary: string;
  eliminationSecondary: string;
  isEliminated: boolean;
  isQualifiedTop8: boolean;
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
  const currentRank = currentStanding?.rank ?? 8;
  const maxPossibleWins = currentWins + remainingCount;

  // Standar kelolosan Top 8 Play-Ins = minimal 3 Wins
  const TARGET_TOP_8_WINS = 3;
  const neededWins = Math.max(0, TARGET_TOP_8_WINS - currentWins);
  const isEliminated = maxPossibleWins < TARGET_TOP_8_WINS;
  const isQualifiedTop8 = currentWins >= TARGET_TOP_8_WINS;

  // 1. Probabilitas Dinamis (Total selalu 100%)
  let quarterFinalsProb = 0;
  let playInsProb = 0;
  let eliminationProb = 0;

  if (isEliminated) {
    quarterFinalsProb = 0;
    playInsProb = 0;
    eliminationProb = 100;
  } else if (isQualifiedTop8) {
    if (currentWins >= 4) {
      quarterFinalsProb = 65;
      playInsProb = 35;
      eliminationProb = 0;
    } else {
      quarterFinalsProb = 30;
      playInsProb = 70;
      eliminationProb = 0;
    }
  } else {
    // Tim dalam persaingan (0, 1, 2 Wins)
    if (currentWins === 2) {
      quarterFinalsProb = remainingCount >= 2 ? 15 : 5;
      playInsProb = 65;
      eliminationProb = 20;
    } else if (currentWins === 1) {
      quarterFinalsProb = remainingCount >= 3 ? 5 : 0;
      playInsProb = 40;
      eliminationProb = 55;
    } else {
      quarterFinalsProb = 0;
      playInsProb = 15;
      eliminationProb = 85;
    }
  }

  // 2. Syarat & Batas Dinamis (Kartu Kiri & Kanan)
  let targetTitle = "Target Top 8";
  let targetPrimary = `Min. ${TARGET_TOP_8_WINS} Match Wins`;
  let targetSecondary = "Wajib Pts Diff ≥ +6";

  let eliminationTitle = "Batas Gugur";
  let eliminationPrimary = "Maks. 1x Match Lose";
  let eliminationSecondary = "2x Lose = Pasti Gugur";

  // Hitung toleransi kekalahan maksimal sebelum tereliminasi
  const allowedLosses = Math.max(0, maxPossibleWins - TARGET_TOP_8_WINS);

  if (isEliminated) {
    targetTitle = "Status Gugur";
    targetPrimary = "Gugur Matematis";
    targetSecondary = `Maks. Win (${maxPossibleWins}) < ${TARGET_TOP_8_WINS}`;

    eliminationTitle = "Status Gugur";
    eliminationPrimary = "Sudah Tereliminasi";
    eliminationSecondary = "Peluang Top 8 Tertutup";
  } else if (isQualifiedTop8) {
    targetTitle = "Kunci Playoff";
    targetPrimary = "Tiket Top 8 Terkunci";
    targetSecondary = "Fokus Amankan Seed Quarter";

    eliminationTitle = "Batas Gugur";
    eliminationPrimary = "Aman dari Gugur";
    eliminationSecondary = "Pasti Masuk Play-Ins / Quarter";
  } else {
    // Belum lolos & belum gugur
    targetTitle = "Target Kelolosan";
    targetPrimary = `Butuh ${neededWins} Win Lagi`;
    targetSecondary = `Dari sisa ${remainingCount} pertandingan`;

    eliminationTitle = "Batas Gugur";
    if (allowedLosses === 0) {
      eliminationPrimary = "Nol Toleransi Kalah";
      eliminationSecondary = "1x Kalah = Pasti Gugur";
    } else {
      eliminationPrimary = `Maks. ${allowedLosses}x Match Lose`;
      eliminationSecondary = `${allowedLosses + 1}x Lose = Pasti Gugur`;
    }
  }

  // 3. Roadmap Per Pekan
  const weeklyRoadmap: TacticalWeekMatch[] = unfinishedMatches.map((m, idx) => {
    const isA = m.teamAName.toLowerCase().trim() === cleanTarget;
    const oppName = isA ? m.teamBName : m.teamAName;
    const oppLogo = (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp";
    const oppStanding = standings.find((s) => s.teamName.toLowerCase().trim() === oppName.toLowerCase().trim());
    const oppRank = oppStanding?.rank ?? 99;

    const isDirectRival = Math.abs(currentRank - oppRank) <= 2;
    const isOppTopTier = oppRank <= 2;
    const isSelfTopTier = currentRank <= 2;

    let urgencyLevel: TacticalWeekMatch["urgencyLevel"] = "STANDARD";
    let urgencyLabel = "Target Win";
    let targetInstruction = "Menang skor 10-0 s/d 10-4";

    if (allowedLosses === 0 && !isQualifiedTop8) {
      urgencyLevel = "DO_OR_DIE";
      urgencyLabel = "🔥 Laga Hidup-Mati";
      targetInstruction = "Wajib Menang (Pts Diff ≥ +6)";
    } else if (isOppTopTier && isSelfTopTier) {
      urgencyLevel = "CRITICAL_RIVAL";
      urgencyLabel = "👑 Duel Puncak";
      targetInstruction = "Perebutan Juara Grup / Top Seed";
    } else if (isOppTopTier && !isSelfTopTier) {
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

  // 4. Instruksi Operasional Dinamis
  let operationalInstruction = "";
  if (isEliminated) {
    operationalInstruction = "Peluang Top 8 tertutup secara matematis. Maksimalkan sisa laga untuk perbaikan peringkat grup.";
  } else if (isQualifiedTop8) {
    operationalInstruction = `Posisi Top 8 sudah aman (${currentWins} Wins). Pertahankan performa dan selisih skor (+${currentPtsDiff}) untuk mengunci posisi unggulan Quarter Finals.`;
  } else if (allowedLosses === 0) {
    operationalInstruction = `Tidak ada toleransi kekalahan lagi. Wajib sapu bersih ${neededWins} kemenangan di sisa match untuk menjaga peluang Top 8.`;
  } else {
    operationalInstruction = `Amankan minimal ${neededWins} Match Win lagi dari sisa ${remainingCount} pertandingan dan pertahankan Pts Diff positif untuk mengunci posisi Top 8.`;
  }

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
    targetTitle,
    targetPrimary,
    targetSecondary,
    eliminationTitle,
    eliminationPrimary,
    eliminationSecondary,
    isEliminated,
    isQualifiedTop8,
    weeklyRoadmap,
    operationalInstruction,
  };
    }
