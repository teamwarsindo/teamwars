import { NextResponse, NextRequest } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { reports } = data;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada data match report yang dikirim!" },
        { status: 400 }
      );
    }

    const schedules = (await kv.get<any[]>("twi:schedules")) || [];
    let isUpdated = false;

    for (const report of reports) {
      const scheduleIdx = schedules.findIndex(
        (s) => (s.id || `match-${s.matchNumber}`) === report.matchId
      );

      if (scheduleIdx !== -1) {
        schedules[scheduleIdx].reportImageUrl = report.imageUrl;
        schedules[scheduleIdx].reportNotes = report.notes;
        schedules[scheduleIdx].maskedImageUrl = report.maskedImageUrl;
        schedules[scheduleIdx].reportUpdatedAt = new Date().toISOString();
        schedules[scheduleIdx].isReadyToPublish = true; // Siap publish
        schedules[scheduleIdx].discordSynced = false;   // Antrekan ke Cron Job

        isUpdated = true;
      }
    }

    if (isUpdated) {
      await kv.set("twi:schedules", schedules);
    }

    return NextResponse.json({
      success: true,
      message: "Data report berhasil disimpan. Masuk antrean publish otomatis!",
    });
  } catch (error: any) {
    console.error("Match Report Save Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat menyimpan." },
      { status: 500 }
    );
  }
}