// 1. KONFIGURASI MUSIM & KICK-OFF BASELINE (Senin Pukul 08.00 WIB)
export const CURRENT_SEASON = 7;
export const TWI_START_DATETIME = "2026-08-03T08:00:00+07:00";

// 2. NAMA RESMI DIVISI GRUP
export const DIVISION_MAP = {
  GROUP_A: "Anda Yakin?",
  GROUP_B: "Sakurasawa Fighters",
} as const;

export type DivisionGroupType = (typeof DIVISION_MAP)[keyof typeof DIVISION_MAP];

// 3. REGULASI, KUOTA KUALIFIKASI & SISTEM POIN
export const TOURNAMENT_RULES = {
  TOP_DIV_QUOTA_PER_GROUP: 2,   // Top 1 & 2 Divisi otomatis lolos Playoff
  GLOBAL_PLAYOFF_QUOTA: 8,      // Rank 1 s/d 8 Global (Wildcard Playoff)
  PLAYOFF_START_WEEK: 8,        // Week 8 ke atas masuk fase Playoff
  TOTAL_TEAMS_PER_GROUP: 8,     // 8 tim per divisi
  POINTS_WIN: 10,
  POINTS_LOSE: 0,
} as const;