export const STORAGE_KEY = "twi_match_report_draft_v1";

export interface TeamInfo {
  name: string;
  code: string;
  emoji: string;
}

export interface MatchItem {
  id: string;
  group: string;
  week: number;
  matchNumber: number;
  teamA: TeamInfo;
  teamB: TeamInfo;
}

export interface MatchReportEntry {
  matchId: string;
  imageUrl: string;
  imagePublicId?: string;
  notes: string;
  isUploading?: boolean;
}

export function generateFileName(match: MatchItem): string {
  const codeA = match.teamA.code.toLowerCase().replace(/[^a-z0-9]/g, "");
  const codeB = match.teamB.code.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `mr_w${match.week}_m${match.matchNumber}_${codeA}_${codeB}`;
}

export function maskImageUrl(originalUrl: string, fileName: string): string {
  if (!originalUrl) return "";
  // Contoh masking ke domain sendiri
  const origin = typeof window !== "undefined" ? window.location.origin : "https://teamwars.web.id";
  return `${origin}/cdn/match-reports/${fileName}.png`;
}