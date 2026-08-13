export const STORAGE_KEY = "twi_match_report_draft_v1";

export interface TeamInfo {
  name: string;
  code?: string;
  slug?: string;
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

// 🟢 EKSTRAK KODETIM BERSIH (CONTOH: "Final Chapter" -> "fc", "DS SAKURAJIMA" -> "ds")
export function getCleanTeamCode(team: TeamInfo): string {
  // Priority 1: Jika slug / code khusus sudah ada
  if (team.slug && team.slug.trim() !== "") {
    const cleanSlug = team.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanSlug.length <= 5) return cleanSlug;
  }
  
  if (team.code && team.code.trim() !== "" && team.code !== team.name) {
    return team.code.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  const name = team.name || "team";
  const words = name.trim().split(/\s+/);

  // Jika nama tim terdiri dari beberapa kata (misal: "Final Chapter"), ambil inisial "fc"
  if (words.length > 1) {
    return words.map((w) => w[0]).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Jika 1 kata, ambil 3-4 huruf pertama
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 4);
}

// 🟢 FORMAT NAMA FILE MASKING KODETIM: report_m1_fc_ds.png
export function generateFileName(match: MatchItem): string {
  const codeA = getCleanTeamCode(match.teamA);
  const codeB = getCleanTeamCode(match.teamB);
  return `report_m${match.matchNumber}_${codeA}_${codeB}`;
}

export function maskImageUrl(originalUrl: string, fileName: string): string {
  if (!originalUrl) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.teamwars.web.id";
  return `${origin}/report/${fileName}.png`;
}
