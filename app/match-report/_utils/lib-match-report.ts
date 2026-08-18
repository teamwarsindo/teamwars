export const STORAGE_KEY = "twi_match_report_draft_v1";

export interface TeamInfo {
  name: string;
  code: string; // Wajib dari DB (kodeTim)
  emoji?: string;
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
  imageUrl?: string;
  notes?: string;
  isUploading?: boolean;
  uploadStatus?: "idle" | "success" | "error";
  errorMessage?: string;
}

// 🟢 PAKSA MENGGUNAKAN KODETIM DARI DB (TANPA FALLBACK PEMOTONGAN NAMA)
export function getStrictTeamCode(team: TeamInfo): string {
  if (!team.code || team.code.trim() === "") {
    throw new Error(`Data 'kodeTim' untuk team '${team.name}' tidak ditemukan di DB KV Redis!`);
  }
  return team.code.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

// 🟢 GENERATE FILE NAME STRICT
export function generateFileName(match: MatchItem): string {
  const codeA = getStrictTeamCode(match.teamA);
  const codeB = getStrictTeamCode(match.teamB);
  return `report_m${match.matchNumber}_${codeA}_${codeB}`;
}

// 🟢 PAKSA URL MASKING (TANPA FALLBACK CLOUDINARY)
export function maskImageUrl(originalUrl: string, fileName: string): string {
  if (!originalUrl) {
    throw new Error("URL Gambar asli dari Cloudinary tidak ditemukan untuk di-masking.");
  }
  if (!fileName) {
    throw new Error("Target File Name tidak valid untuk masking.");
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.teamwars.web.id";
  return `${origin}/report/${fileName}.png`;
  }
