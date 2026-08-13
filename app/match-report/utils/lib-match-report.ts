export const STORAGE_KEY = "twi_match_report_draft_v1";

export interface TeamInfo {
  name: string;
  code: string;
  logo?: string;
}

export interface MatchItem {
  id: string;
  group: string;
  week: number;
  matchNumber: number;
  scoreA?: number;
  scoreB?: number;
  teamALogo?: string;
  teamBLogo?: string;
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

// Ambil kode tim / inisial bersih (contoh: "UXE", "FAB")
export function getTeamCode(teamNameOrCode: string): string {
  if (!teamNameOrCode) return "team";
  
  const cleaned = teamNameOrCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = teamNameOrCode.trim().split(/\s+/);
  
  if (words.length > 1 && cleaned.length > 5) {
    return words.map((w) => w[0]).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  
  return cleaned;
}

// Format Nama File: report_m1_uxe_fab
export function generateFileName(match: MatchItem): string {
  const codeA = getTeamCode(match.teamA.code || match.teamA.name);
  const codeB = getTeamCode(match.teamB.code || match.teamB.name);
  return `report_m${match.matchNumber}_${codeA}_${codeB}`;
}

// Masking URL Domain
export function maskImageUrl(originalUrl: string, fileName: string): string {
  if (!originalUrl) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://teamwars.web.id";
  return `${origin}/report/${fileName}.png`;
}
