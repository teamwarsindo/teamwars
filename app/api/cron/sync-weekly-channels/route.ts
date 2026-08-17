import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getTournamentWeekNumber } from "@/app/tournament/_library/calculator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isForce = searchParams.get("force") === "true"; // Bypass lock jika butuh paksa jalan

    // 🟢 1. Hitung minggu saat ini via utils resmi library
    const currentWeekNum = getTournamentWeekNumber();
    const targetWeek = `Week ${currentWeekNum}`;
    const kvLockKey = `cron:sync_channel_lock:week_${currentWeekNum}`;

    // 🔒 2. Proteksi eksekusi: Maksimal 1x per minggu
    if (!isForce) {
      const alreadyExecuted = await kv.get<string>(kvLockKey);
      if (alreadyExecuted) {
        return NextResponse.json(
          {
            success: false,
            message: `Sync channel untuk ${targetWeek} sudah pernah dieksekusi sebelumnya pada ${alreadyExecuted}. Eksekusi dilewati.`,
            targetWeek,
            alreadyExecuted: true,
          },
          { status: 200 }
        );
      }
    }

    // Tentukan Base URL
    const host = req.headers.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    // ⚡ 3. Teruskan ke endpoint sinkronisasi channel Discord
    const response = await fetch(`${baseUrl}/api/tournament/sync-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "WEEK",
        targetWeek,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Gagal menjalankan sync untuk ${targetWeek}`);
    }

    // 🔐 4. Kunci minggu ini di KV (Expired otomatis setelah 10 hari)
    const executedTimestamp = new Date().toISOString();
    await kv.set(kvLockKey, executedTimestamp, { ex: 60 * 60 * 24 * 10 });

    return NextResponse.json({
      success: true,
      message: `Berhasil sinkronisasi channel untuk ${targetWeek}`,
      targetWeek,
      executedAt: executedTimestamp,
      result: data,
    });
  } catch (error: any) {
    console.error("[CRON ERROR] Sync Weekly Channels Failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
