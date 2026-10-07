// ============================================================================
// SINGLE SOURCE OF TRUTH: KONFIGURASI & KALKULASI SPONSORSHIP TWI S8
// ============================================================================

export interface TournamentPhase {
  id: string;
  step: string;
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  description: string;
  badgeTheme: "emerald" | "blue" | "rose" | "amber";
  status: "upcoming" | "ongoing" | "completed";
}

export interface BudgetItem {
  id: string;
  phaseLabel: string;
  phaseCategory: "GRUP" | "PLAYOFF" | "MANAGEMENT" | "PRIZE";
  name: string;
  description: string;
  quantityLabel: string;
  unitRate: number;
  totalAmount: number;
  badgeTheme: "blue" | "rose" | "amber" | "purple" | "emerald";
}

export interface PrizeDistributionItem {
  placement: string;
  nominal: number;
  additionalReward: string;
  isSpecial?: boolean;
}

export interface SponsorshipTier {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  slots: string;
  price: number;
  isFeatured?: boolean;
  benefits: string[];
}

export const TOURNAMENT_PARAMS = {
  SEASON: 8,
  GAME_TITLE: "Yu-Gi-Oh! Master Duel",
  FORMAT: "5 vs 5 Team Battle",
  TOTAL_TEAMS: 32,
  TOTAL_GROUPS: 4,
  TEAMS_PER_GROUP: 8,
  REGISTRATION_FEE_PER_TEAM: 250000,
  FEE_REFEREE_PER_MATCH: 50000,
  FEE_STREAMER_PER_MATCH: 50000,
  GROUP_STAGE_MATCHES: 112,
  PLAYOFF_MATCHES: 15,
  MANAGEMENT_EXECUTIVES: 3,
  MANAGEMENT_FEE_PER_PERSON: 2000000,
  SPONSOR_PRIZE_TOPUP: 5000000,
} as const;

export const SPONSORSHIP_TIMELINE: TournamentPhase[] = [
  {
    id: "fase-1",
    step: "01",
    name: "Persiapan & Sponsorship",
    period: "1 - 31 Oktober 2026",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    description: "Finalisasi regulasi, teknis platform web, dan penguncian slot kemitraan sponsor.",
    badgeTheme: "amber",
    status: "ongoing",
  },
  {
    id: "fase-2",
    step: "02",
    name: "Fase Registrasi",
    period: "1 - 30 November 2026",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    description: "Pendaftaran 32 tim via Discord resmi. Uang pendaftaran 100% dialokasikan utuh ke hadiah.",
    badgeTheme: "emerald",
    status: "upcoming",
  },
  {
    id: "fase-3",
    step: "03",
    name: "Group Stages (Round-Robin)",
    period: "1 Des 2026 - 28 Feb 2027",
    startDate: "2026-12-01",
    endDate: "2027-02-28",
    description: "Pertandingan babak 4 grup (112 match) dengan penyiaran langsung dan ad-libs brand.",
    badgeTheme: "blue",
    status: "upcoming",
  },
  {
    id: "fase-4",
    step: "04",
    name: "Knockout & Grand Final",
    period: "1 - 21 Maret 2027",
    startDate: "2027-03-01",
    endDate: "2027-03-21",
    description: "Puncak 15 match eliminasi, penentuan tim juara, dan seremoni penghargaan mitra.",
    badgeTheme: "rose",
    status: "upcoming",
  },
];

export const TOTAL_MATCHES =
  TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES + TOURNAMENT_PARAMS.PLAYOFF_MATCHES;

export const REGISTRATION_TOTAL =
  TOURNAMENT_PARAMS.TOTAL_TEAMS * TOURNAMENT_PARAMS.REGISTRATION_FEE_PER_TEAM;

export const BUDGET_BREAKDOWN: BudgetItem[] = [
  {
    id: "referee-group",
    phaseLabel: "FASE GRUP",
    phaseCategory: "GRUP",
    name: "Group Stages Wasit",
    description: "Pengawasan 112 match babak round-robin 4 grup",
    quantityLabel: `${TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES} Match`,
    unitRate: TOURNAMENT_PARAMS.FEE_REFEREE_PER_MATCH,
    totalAmount: TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES * TOURNAMENT_PARAMS.FEE_REFEREE_PER_MATCH,
    badgeTheme: "blue",
  },
  {
    id: "streamer-group",
    phaseLabel: "FASE GRUP",
    phaseCategory: "GRUP",
    name: "Group Stages Streamer",
    description: "Live streaming & ad-libs branding sponsor",
    quantityLabel: `${TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES} Match`,
    unitRate: TOURNAMENT_PARAMS.FEE_STREAMER_PER_MATCH,
    totalAmount: TOURNAMENT_PARAMS.GROUP_STAGE_MATCHES * TOURNAMENT_PARAMS.FEE_STREAMER_PER_MATCH,
    badgeTheme: "rose",
  },
  {
    id: "referee-playoff",
    phaseLabel: "PLAYOFFS / KNOCKOUT",
    phaseCategory: "PLAYOFF",
    name: "Knock-Out Stages Wasit",
    description: "Pengawasan sistem gugur R16 s/d Final",
    quantityLabel: `${TOURNAMENT_PARAMS.PLAYOFF_MATCHES} Match`,
    unitRate: TOURNAMENT_PARAMS.FEE_REFEREE_PER_MATCH,
    totalAmount: TOURNAMENT_PARAMS.PLAYOFF_MATCHES * TOURNAMENT_PARAMS.FEE_REFEREE_PER_MATCH,
    badgeTheme: "amber",
  },
  {
    id: "streamer-playoff",
    phaseLabel: "PLAYOFFS / KNOCKOUT",
    phaseCategory: "PLAYOFF",
    name: "Knock-Out Stages Streamer",
    description: "Siaran laga penentuan juara & seremoni piala",
    quantityLabel: `${TOURNAMENT_PARAMS.PLAYOFF_MATCHES} Match`,
    unitRate: TOURNAMENT_PARAMS.FEE_STREAMER_PER_MATCH,
    totalAmount: TOURNAMENT_PARAMS.PLAYOFF_MATCHES * TOURNAMENT_PARAMS.FEE_STREAMER_PER_MATCH,
    badgeTheme: "amber",
  },
  {
    id: "management-ops",
    phaseLabel: "MANAJEMEN & PLATFORM",
    phaseCategory: "MANAGEMENT",
    name: "Biaya Panitia (CEO, CTO, CJO)",
    description: "Infrastruktur web teamwars.web.id, bot Discord, & manajemen",
    quantityLabel: `${TOURNAMENT_PARAMS.MANAGEMENT_EXECUTIVES} Orang Eksekutif`,
    unitRate: TOURNAMENT_PARAMS.MANAGEMENT_FEE_PER_PERSON,
    totalAmount: TOURNAMENT_PARAMS.MANAGEMENT_EXECUTIVES * TOURNAMENT_PARAMS.MANAGEMENT_FEE_PER_PERSON,
    badgeTheme: "purple",
  },
  {
    id: "sponsor-prize-pool",
    phaseLabel: "DANA HADIAH SPONSOR",
    phaseCategory: "PRIZE",
    name: "Tambahan Hadiah di Luar Regis",
    description: "Top-up khusus dari sponsor untuk menambah prize pool juara",
    quantityLabel: "1 Musim Turnamen",
    unitRate: TOURNAMENT_PARAMS.SPONSOR_PRIZE_TOPUP,
    totalAmount: TOURNAMENT_PARAMS.SPONSOR_PRIZE_TOPUP,
    badgeTheme: "emerald",
  },
];

export const TOTAL_SPONSORSHIP_BUDGET = BUDGET_BREAKDOWN.reduce(
  (acc, item) => acc + item.totalAmount,
  0
);

export const TOTAL_PRIZE_POOL = REGISTRATION_TOTAL + TOURNAMENT_PARAMS.SPONSOR_PRIZE_TOPUP;

export const PRIZE_DISTRIBUTION: PrizeDistributionItem[] = [
  { placement: "🥇 Juara 1", nominal: 6000000, additionalReward: "Trophy + E-Certificate" },
  { placement: "🥈 Juara 2", nominal: 3200000, additionalReward: "E-Certificate" },
  { placement: "🥉 Juara 3", nominal: 2000000, additionalReward: "E-Certificate" },
  { placement: "🎖️ Juara 4", nominal: 1000000, additionalReward: "E-Certificate" },
  { placement: "⭐ MVP Player / Best Win Rate", nominal: 800000, additionalReward: "Plakat Spesial", isSpecial: true },
];

export const SPONSORSHIP_TIERS: SponsorshipTier[] = [
  {
    id: "title-partner",
    badge: "TITLE PARTNER",
    title: "Sponsor Utama",
    subtitle: '"Team Wars Indonesia S8 presented by [Nama Brand]"',
    slots: "Eksklusif 1 Slot",
    price: 8000000,
    isFeatured: true,
    benefits: [
      "Nama Pendamping: Melekat di seluruh judul resmi kompetisi.",
      "Logo Terbesar: Tampil paling dominan di seluruh poster resmi acara.",
      "Overlay Permanen: Tetap tayang di 100% pertandingan live streaming.",
      "Ad-libs Streamer: Disebut secara berkala dengan intensitas tertinggi.",
      "Aktivasi Peserta: Berhak mewajibkan duelist mem-follow akun sponsor.",
      "Eksposur Discord: Banner channel utama, blast 4x kanal pengumuman, dan role khusus.",
    ],
  },
  {
    id: "prize-partner",
    badge: "PRIZE PARTNER",
    title: "Sponsor Pendukung",
    subtitle: "Sponsor pendukung hadiah juara kompetisi",
    slots: "2 Slot Tersedia",
    price: 5000000,
    benefits: [
      "Melekat pada Hadiah: Brand tampil di seremoni penyerahan & poster juara.",
      "Logo Sedang: Tercantum di seluruh poster pertandingan resmi.",
      "Overlay Siaran: Tampil bergantian di setiap laga siaran langsung.",
      "Aktivasi & Broadcast: Disebut streamer & 2x blast promosi di Discord.",
    ],
  },
  {
    id: "community-partner",
    badge: "COMMUNITY PARTNER",
    title: "Sponsor Komunitas",
    subtitle: "Cocok untuk toko kartu, apparel, clan, atau UMKM",
    slots: "4 Slot Tersedia",
    price: 2000000,
    benefits: [
      "Logo ukuran kecil di poster babak final turnamen.",
      "Tampil di layar khusus sponsor pada live streaming.",
      "Pencantuman nama & logo di daftar sponsor Discord resmi.",
      "1x pengumuman khusus promosi di server Discord TWI.",
    ],
  },
];

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
