export interface RefereeProfile {
  name: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  feePerMatch: number;
}

export interface RefereePayout {
  id: string;
  refereeName: string;
  amountPaid: number;
  paidWeeks?: number[];
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
  matches: Array<{
    id: string;
    weekNumber: number;
    teamAName: string;
    teamBName: string;
    scoreA: number;
    scoreB: number;
    hasReport: boolean;
    reportUrl?: string;
  }>;
}
