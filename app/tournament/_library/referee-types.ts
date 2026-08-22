export interface RefereeProfile {
  name: string;             // Nama wasit
  bankName: string;         // Contoh: "BCA"
  accountNumber: string;    // Contoh: "8271009921"
  accountHolder: string;    // Contoh: "Alex Chandra"
  feePerMatch: number;      // Default 15000
}

export interface RefereePayout {
  id: string;
  refereeName: string;
  amountPaid: number;
  paidWeeks: number[];
  paymentDate: string;
  transferReceiptUrl?: string;
  notes?: string;
}

export interface RefereeAggregatedData {
  name: string;
  totalMatches: number;
  weekBreakdown: Record<number, number>;
  feePerMatch: number;
  totalEarned: number;
  totalPaid: number;
  remainingUnpaid: number;
  payoutStatus: "LUNAS" | "PARSIAL" | "BELUM_DIBAYAR";
  profile?: RefereeProfile;
  payoutHistory: RefereePayout[];
  missingReportCount: number;
}
