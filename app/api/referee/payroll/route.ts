import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth";
import { DEFAULT_FEE, maskAccountNumber, getPayoutStatus } from "@/app/tournament/_library/referee-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const session = await getServerSession();
  const isAdmin = Boolean(session?.user);
  const isChief = token === process.env.CHIEF_REFEREE_TOKEN;

  if (!isAdmin && !isChief) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedules = await kv.get<any[]>("twi:schedules") || [];
  const profiles = await kv.get<Record<string, any>>("twi:referees:profiles") || {};
  const payouts = await kv.get<any[]>("twi:referees:payouts") || [];

  const refereeMap = new Map();

  // Proses Profil
  Object.values(profiles).forEach(p => refereeMap.set(p.name.toLowerCase().trim(), {
    name: p.name, totalMatches: 0, feePerMatch: p.feePerMatch || DEFAULT_FEE,
    totalEarned: 0, totalPaid: 0, missingReportCount: 0, payoutHistory: [],
    profile: { ...p, accountNumber: maskAccountNumber(p.accountNumber, isAdmin) }
  }));

  // Agregasi Schedules
  schedules.filter(m => m.isFinished && m.referee).forEach(m => {
    const key = m.referee.toLowerCase().trim();
    if (!refereeMap.has(key)) refereeMap.set(key, { name: m.referee, totalMatches: 0, feePerMatch: DEFAULT_FEE, totalEarned: 0, totalPaid: 0, missingReportCount: 0, payoutHistory: [] });
    const ref = refereeMap.get(key);
    ref.totalMatches++;
    if (!m.reportImageUrl && !m.maskedImageUrl) ref.missingReportCount++;
  });

  // Agregasi Payout
  payouts.forEach(pay => {
    const key = pay.refereeName.toLowerCase().trim();
    if (refereeMap.has(key)) {
      const ref = refereeMap.get(key);
      ref.payoutHistory.push(pay);
      ref.totalPaid += Number(pay.amountPaid);
    }
  });

  const finalData = Array.from(refereeMap.values()).map(r => ({
    ...r,
    totalEarned: r.totalMatches * r.feePerMatch,
    remainingUnpaid: Math.max(0, (r.totalMatches * r.feePerMatch) - r.totalPaid),
    payoutStatus: getPayoutStatus(r.totalMatches * r.feePerMatch, r.totalPaid)
  }));

  return NextResponse.json({ isAdmin, referees: finalData });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const payouts = await kv.get<any[]>("twi:referees:payouts") || [];
  payouts.unshift({ ...body, id: Date.now().toString(), paymentDate: new Date().toISOString() });
  await kv.set("twi:referees:payouts", payouts);
  return NextResponse.json({ success: true });
    }
