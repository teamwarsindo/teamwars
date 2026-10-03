import { MatchScheduleItem } from "../types";
import { TOURNAMENT_RULES } from "../constants";

export interface PlayoffSlotTeam {
  name: string;
  logo: string;
  score: number;
  isPlaceholder: boolean;
  isWinner: boolean;
  seedLabel: string;
}

export interface PlayoffBracketMatchItem {
  id: string;
  label: string;
  weekNumber: number;
  isFinished: boolean;
  teamA: PlayoffSlotTeam;
  teamB: PlayoffSlotTeam;
}

export interface PlayoffBracketStructure {
  playIns: PlayoffBracketMatchItem[];
  quarterFinals: PlayoffBracketMatchItem[];
  semiFinals: PlayoffBracketMatchItem[];
  grandFinal: PlayoffBracketMatchItem | null;
}

export interface PlayoffProgressionNode {
  sourceMatchId: string;
  targetMatchId: string;
  targetSlot: 'A' | 'B';
}

export const PLAYOFF_PROGRESSION_TREE: PlayoffProgressionNode[] = [
  // 1. Play-Ins -> Quarter-Finals (Mengisi lawan di slot B)
  { sourceMatchId: 'match-po-1', targetMatchId: 'match-po-5', targetSlot: 'B' },
  { sourceMatchId: 'match-po-2', targetMatchId: 'match-po-6', targetSlot: 'B' },
  { sourceMatchId: 'match-po-3', targetMatchId: 'match-po-7', targetSlot: 'B' },
  { sourceMatchId: 'match-po-4', targetMatchId: 'match-po-8', targetSlot: 'B' },

  // 2. Quarter-Finals -> Semi-Finals
  // Semi-Final #1: Winner QF-1 vs Winner QF-2
  { sourceMatchId: 'match-po-5', targetMatchId: 'match-po-9', targetSlot: 'A' },
  { sourceMatchId: 'match-po-6', targetMatchId: 'match-po-9', targetSlot: 'B' },
  // Semi-Final #2: Winner QF-3 vs Winner QF-4
  { sourceMatchId: 'match-po-7', targetMatchId: 'match-po-10', targetSlot: 'A' },
  { sourceMatchId: 'match-po-8', targetMatchId: 'match-po-10', targetSlot: 'B' },

  // 3. Semi-Finals -> Grand Final
  // Grand Final: Winner SF-1 vs Winner SF-2
  { sourceMatchId: 'match-po-9', targetMatchId: 'match-po-11', targetSlot: 'A' },
  { sourceMatchId: 'match-po-10', targetMatchId: 'match-po-11', targetSlot: 'B' },
];

export function advancePlayoffWinner(
  schedules: MatchScheduleItem[],
  finishedMatchId?: string
): boolean {
  let anyUpdated = false;

  for (const node of PLAYOFF_PROGRESSION_TREE) {
    if (finishedMatchId && node.sourceMatchId !== finishedMatchId) {
      continue;
    }

    const sourceMatch = schedules.find((m) => m.id === node.sourceMatchId);
    if (!sourceMatch) continue;

    const scoreA = Number(sourceMatch.scoreA) || 0;
    const scoreB = Number(sourceMatch.scoreB) || 0;
    const isFinished = Boolean(sourceMatch.isFinished);

    if (!isFinished && scoreA === 0 && scoreB === 0) continue;
    if (scoreA === scoreB) continue;

    const isWinnerA = scoreA > scoreB;
    const winnerName = isWinnerA ? sourceMatch.teamAName : sourceMatch.teamBName;
    const winnerLogo = isWinnerA ? sourceMatch.teamALogo : sourceMatch.teamBLogo;
    const winnerId = isWinnerA ? (sourceMatch as any).teamAId : (sourceMatch as any).teamBId;
    const winnerColor = isWinnerA ? (sourceMatch as any).teamAColor : (sourceMatch as any).teamBColor;
    if (!winnerName) continue;

    const targetIdx = schedules.findIndex((m) => m.id === node.targetMatchId);
    if (targetIdx === -1) continue;

    const targetMatch = schedules[targetIdx];

    // PROTEKSI DATA LEGACY: Jika babak target sudah selesai, lewati
    if (targetMatch.isFinished) continue;

    const currentSlotName = node.targetSlot === 'A' ? targetMatch.teamAName : targetMatch.teamBName;

    // Isi jika masih placeholder atau belum terisi pemenang yang benar
    if (isSlotPlaceholder(currentSlotName) || currentSlotName !== winnerName) {
      if (node.targetSlot === 'A') {
        targetMatch.teamAName = winnerName;
        if (winnerLogo) targetMatch.teamALogo = winnerLogo;
        if (winnerId) (targetMatch as any).teamAId = winnerId;
        if (winnerColor) (targetMatch as any).teamAColor = winnerColor;
      } else {
        targetMatch.teamBName = winnerName;
        if (winnerLogo) targetMatch.teamBLogo = winnerLogo;
        if (winnerId) (targetMatch as any).teamBId = winnerId;
        if (winnerColor) (targetMatch as any).teamBColor = winnerColor;
      }
      schedules[targetIdx] = targetMatch;
      anyUpdated = true;
    }
  }

  return anyUpdated;
}

function isSlotPlaceholder(name?: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return (
    lower.includes("tbd") ||
    lower.includes("winner") ||
    lower.includes("pemenang") ||
    lower.includes("top 1") ||
    lower.includes("top 2") ||
    lower.includes("seed")
  );
}

function mapScheduleToPlayoffItem(
  schedule: MatchScheduleItem | undefined,
  defaultLabel: string,
  fallbackSeedA: string,
  fallbackSeedB: string
): PlayoffBracketMatchItem {
  const teamAName = schedule?.teamAName || fallbackSeedA;
  const teamBName = schedule?.teamBName || fallbackSeedB;
  const scoreA = Number(schedule?.scoreA) || 0;
  const scoreB = Number(schedule?.scoreB) || 0;
  const isFinished = Boolean(schedule?.isFinished);

  return {
    id: schedule?.id || defaultLabel.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    label: defaultLabel,
    weekNumber: Number(schedule?.weekNumber) || TOURNAMENT_RULES.PLAYOFF_START_WEEK,
    isFinished,
    teamA: {
      name: teamAName,
      logo: schedule?.teamALogo || "/logo.webp",
      score: scoreA,
      isPlaceholder: isSlotPlaceholder(teamAName),
      isWinner: isFinished && scoreA > scoreB,
      seedLabel: fallbackSeedA,
    },
    teamB: {
      name: teamBName,
      logo: schedule?.teamBLogo || "/logo.webp",
      score: scoreB,
      isPlaceholder: isSlotPlaceholder(teamBName),
      isWinner: isFinished && scoreB > scoreA,
      seedLabel: fallbackSeedB,
    },
  };
}

export function buildPlayoffBracket(schedules: MatchScheduleItem[] = []): PlayoffBracketStructure {
  const playoffSchedules = schedules
    .filter((m: any) => {
      const w = Number(m.weekNumber || m.week || 0);
      return w >= TOURNAMENT_RULES.PLAYOFF_START_WEEK || String(m.id || "").startsWith("match-po-");
    })
    .sort((a: any, b: any) => {
      const wA = Number(a.weekNumber || a.week || 0);
      const wB = Number(b.weekNumber || b.week || 0);
      if (wA !== wB) return wA - wB;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

  const findMatch = (pattern: string, fallbackIndex: number) => {
    return (
      playoffSchedules.find(
        (m: any) =>
          String(m.id || "").toLowerCase().includes(pattern) ||
          String(m.matchTitle || "").toLowerCase().includes(pattern) ||
          String(m.stage || "").toLowerCase().includes(pattern)
      ) || playoffSchedules[fallbackIndex]
    );
  };

  const playIns: PlayoffBracketMatchItem[] = [
    mapScheduleToPlayoffItem(findMatch("pi-1", 0), "Play-Ins #1", "Wildcard Seed 1", "Wildcard Seed 8"),
    mapScheduleToPlayoffItem(findMatch("pi-2", 1), "Play-Ins #2", "Wildcard Seed 4", "Wildcard Seed 5"),
    mapScheduleToPlayoffItem(findMatch("pi-3", 2), "Play-Ins #3", "Wildcard Seed 2", "Wildcard Seed 7"),
    mapScheduleToPlayoffItem(findMatch("pi-4", 3), "Play-Ins #4", "Wildcard Seed 3", "Wildcard Seed 6"),
  ];

  const quarterFinals: PlayoffBracketMatchItem[] = [
    mapScheduleToPlayoffItem(findMatch("qf-1", 4), "Quarter-Final #1", "Top 1 Group A", "Winner Play-Ins #1"),
    mapScheduleToPlayoffItem(findMatch("qf-2", 5), "Quarter-Final #2", "Top 2 Group B", "Winner Play-Ins #2"),
    mapScheduleToPlayoffItem(findMatch("qf-3", 6), "Quarter-Final #3", "Top 1 Group B", "Winner Play-Ins #3"),
    mapScheduleToPlayoffItem(findMatch("qf-4", 7), "Quarter-Final #4", "Top 2 Group A", "Winner Play-Ins #4"),
  ];

  const semiFinals: PlayoffBracketMatchItem[] = [
    mapScheduleToPlayoffItem(findMatch("sf-1", 8), "Semi-Final #1", "Winner Quarter-Final #1", "Winner Quarter-Final #2"),
    mapScheduleToPlayoffItem(findMatch("sf-2", 9), "Semi-Final #2", "Winner Quarter-Final #3", "Winner Quarter-Final #4"),
  ];

  const grandFinalMatch = findMatch("gf", 10);
  const grandFinal = grandFinalMatch
    ? mapScheduleToPlayoffItem(grandFinalMatch, "Grand Final", "Winner Semi-Final #1", "Winner Semi-Final #2")
    : null;

  return {
    playIns,
    quarterFinals,
    semiFinals,
    grandFinal,
  };
                                     }
