import { RefereeProfile } from "./referee-types";

export const FEE_PER_MATCH = 15000;

export function maskAccountNumber(acc: string, isAdmin: boolean): string {
  // Jika Admin, tampilkan full. Jika Chief Referee, mask nomornya.
  if (isAdmin || !acc) return acc;
  const clean = acc.trim();
  if (clean.length <= 4) return "••••";
  return `•••• •••• ${clean.slice(-4)}`;
}

export function getPayoutStatus(earned: number, paid: number) {
  if (earned === 0) return "BELUM_DIBAYAR";
  if (paid >= earned) return "LUNAS";
  if (paid > 0) return "PARSIAL";
  return "BELUM_DIBAYAR";
}
