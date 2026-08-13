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

// 🟢 MENGAMBIL KODE TIM / SLUG UTAMA DARI KV DB
export function getCleanTeamCode(team: TeamInfo): string {
  // 1. Utamakan slug atau code jika ada (contoh: "fc", "dss", "uxe")
  const rawCode = team.slug || team.code || team.name;
  if (!rawCode) return "team";

  const cleaned = rawCode.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Jika nama tim panjang tanpa slug khusus, ambil inisial kata
  const words = team.name.trim().split(/\s+/);
  if (words.length > 1 && cleaned.length > 5) {
    return words.map((w) => w[0]).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  return cleaned;
}

// 🟢 FORMAT NAMA FILE MASKING: report_m1_fc_dss
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
