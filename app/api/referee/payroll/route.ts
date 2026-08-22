import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { cookies } from "next/headers";
import { FEE_PER_MATCH, maskAccountNumber, getPayoutStatus } from "@/app/tournament/_library/referee-service";

const CHIEF_TOKEN = process.env.CHIEF_REFEREE_TOKEN || "xK9p2Lm5Qo8RstVb3N2wY7zE4Hj1K0Q";
const SCHEDULES_KEY = "twi:schedules";
const PROFILES_KEY = "twi:referees:profiles";
const PAYOUTS_KEY = "twi:referees:payouts";

async function checkIsAdmin(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  return Boolean(adminSession || authHeader);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    const isAdmin = await checkIsAdmin(req);
    const isChief = token === CHIEF_TOKEN;

    if (!isAdmin && !isChief) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rawSchedules, rawProfiles, rawPayouts] = await Promise.all([
      kv.get<any[]>(SCHEDULES_KEY),
      kv.get<Record<string, any>>(PROFILES_KEY),
      kv.get<any[]>(PAYOUTS_KEY),
    ]);

    const schedules = rawSchedules || [];
    const profiles = rawProfiles || {};
    const payouts = rawPayouts || [];

    const refereeMap = new Map<string, any>();

    // 1. Ambil data profil terdaftar
    Object.values(profiles).forEach((p: any) => {
      const key = (p.name || "").toLowerCase().trim();
      if (!key) return;
      refereeMap.set(key, {
        name: p.name,
        totalMatches: 0,
        weekBreakdown: {},
        feePerMatch: p.feePerMatch || FEE_PER_MATCH,
        totalEarned: 0,
        totalPaid: 0,
        missingReportCount: 0,
        payoutHistory: [],
        matches: [],
        profile: {
          ...p,
          accountNumber: maskAccountNumber(p.accountNumber || "", isAdmin),
        },
      });
    });

    // 2. Agregasi laga yang dipimpin wasit dari schedule
    schedules
      .filter((m: any) => m.isFinished && m.referee)
      .forEach((m: any) => {
        const key = m.referee.toLowerCase().trim();
        if (!refereeMap.has(key)) {
          refereeMap.set(key, {
            name: m.referee,
            totalMatches: 0,
            weekBreakdown: {},
            feePerMatch: FEE_PER_MATCH,
            totalEarned: 0,
            totalPaid: 0,
            missingReportCount: 0,
            payoutHistory: [],
            matches: [],
            profile: undefined,
          });
        }
        const ref = refereeMap.get(key);
        ref.totalMatches += 1;
        const w = m.weekNumber || 1;
        ref.weekBreakdown[w] = (ref.weekBreakdown[w] || 0) + 1;

        const hasReport = Boolean(m.reportImageUrl || m.maskedImageUrl);
        if (!hasReport) {
          ref.missingReportCount += 1;
        }

        ref.matches.push({
          id: m.id,
          weekNumber: w,
          teamAName: m.teamAName,
          teamBName: m.teamBName,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          hasReport,
          reportUrl: m.maskedImageUrl || m.reportImageUrl,
        });
      });

    // 3. Masukkan histori pembayaran
    payouts.forEach((pay: any) => {
      const key = (pay.refereeName || "").toLowerCase().trim();
      if (refereeMap.has(key)) {
        const ref = refereeMap.get(key);
        ref.payoutHistory.push(pay);
        ref.totalPaid += Number(pay.amountPaid) || 0;
      }
    });

    // 4. Hitung total gaji dan sisa tagihan
    const referees = Array.from(refereeMap.values())
      .map((r: any) => {
        const earned = r.totalMatches * r.feePerMatch;
        return {
          ...r,
          totalEarned: earned,
          remainingUnpaid: Math.max(0, earned - r.totalPaid),
          payoutStatus: getPayoutStatus(earned, r.totalPaid),
        };
      })
      .sort((a, b) => b.totalMatches - a.totalMatches);

    return NextResponse.json({
      isAdmin,
      isChief,
      referees,
      summary: {
        totalMatchesHandled: referees.reduce((acc, curr) => acc + curr.totalMatches, 0),
        totalPayrollBudget: referees.reduce((acc, curr) => acc + curr.totalEarned, 0),
        totalPaidOut: referees.reduce((acc, curr) => acc + curr.totalPaid, 0),
        totalPendingPayout: referees.reduce((acc, curr) => acc + curr.remainingUnpaid, 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const rawPayouts = (await kv.get<any[]>(PAYOUTS_KEY)) || [];
    const newPayout = { ...body, id: `pay_${Date.now()}`, paymentDate: new Date().toISOString() };
    rawPayouts.unshift(newPayout);
    await kv.set(PAYOUTS_KEY, rawPayouts);
    return NextResponse.json({ success: true, payout: newPayout });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const profile = await req.json();
    const key = (profile.name || "").toLowerCase().trim();
    const rawProfiles = (await kv.get<Record<string, any>>(PROFILES_KEY)) || {};
    rawProfiles[key] = profile;
    await kv.set(PROFILES_KEY, rawProfiles);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
