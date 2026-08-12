export const TOURNAMENT_CONFIG = {
  // Aturan Roster & Pemain
  MAX_ROSTER_SIZE: 5,
  DECKS_PER_PLAYER: 2,

  // Aturan Waktu & Penalti
  PENALTY_MINUTES_PER_DECK: 2, // 1 Deck Telat = -2 Menit
  MAX_LATE_DECKS_OPTION: 10,  // Opsi pilihan telat 0 - 10 Deck (0-20 Menit)
  TIMER_DEFAULT_SECONDS: 900,  // 15 Menit Standar Match Timer
  TIMER_OVERTIME_SECONDS: 180, // 3 Menit Tambahan Pasca TL Timeout

  // Aturan Pertandingan
  MAX_REPEAT_PER_TEAM: 2,      // Maksimal Mode Repeat per Tim
  WARNINGS_FOR_TL: 2,          // 2x Warning SS = 1 Deck Lose (TL)
  WINNING_SCORE_TARGET: 10,    // Target Menang Match (10 Game Win)
} as const;

export const DEFAULT_MASTER_DATA = {
  DECKS: [
    "Blue-Eyes",
    "HERO",
    "Tachyon",
    "Tenyi",
    "Unchained",
    "Shaddoll",
    "Fleur",
    "Performage",
    "Borrel",
    "Sunavalon",
    "Red-Eyes",
    "Cyber Dragon",
    "Dark Magician",
  ],
  SKILLS: [
    "Destiny Draw",
    "Tachyon Dragon Dominance",
    "Battle Chronicle",
    "Archive Skill: Shaddoll",
    "Revolution des Fleurs",
    "Borrel Link",
    "Three Burst Shot",
    "A Trick Up the Sleeve",
  ],
} as const;