import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ScheduleItem {
  id: string;
  matchDate?: string;
  streamPlatform?: string;
  streamer?: string;
  referee?: string;
  streamUrl?: string;
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
  [key: string]: any;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    // Tambahkan query ?dryRun=true jika ingin audit/cek preview dulu tanpa menyimpan ke DB
    const isDryRun = url.searchParams.get("dryRun") === "true";

    // 1. Ambil data schedules (string JSON) dan match_reports (HASH)
    const [rawSchedules, rawReports] = await Promise.all([
      kv.get<ScheduleItem[] | string>("twi:schedules"),
      kv.hgetall<Record<string, any>>("twi:match_reports"),
    ]);

    let schedules: ScheduleItem[] = [];
    if (typeof rawSchedules === "string") {
      try {
        schedules = JSON.parse(rawSchedules);
      } catch {
        schedules = [];
      }
    } else if (Array.isArray(rawSchedules)) {
      schedules = rawSchedules;
    }

    const reportsHash: Record<string, any> = rawReports || {};

    // Penampung audit
    const hasStreamerNoUrl: string[] = [];
    const hasUrlNoStreamer: string[] = [];
    const hasNoReferee: string[] = [];
    const updatedMatches: string[] = [];
    const skippedNotFinished: string[] = [];

    const updatesToSave: Record<string, any> = {};

    for (const schedule of schedules) {
      const matchId = schedule.id;
      if (!matchId) continue;

      // Cek status isFinished (bisa dari flag langsung atau skor >= 10)
      const isFinished = Boolean(
        schedule.isFinished ||
        (schedule.scoreA !== undefined && schedule.scoreA >= 10) ||
        (schedule.scoreB !== undefined && schedule.scoreB >= 10)
      );

      if (!isFinished) {
        skippedNotFinished.push(matchId);
        continue;
      }

      // Ambil report yang sudah ada di hash atau buat skeleton baru
      let currentReport = reportsHash[matchId];
      if (typeof currentReport === "string") {
        try {
          currentReport = JSON.parse(currentReport);
        } catch {
          currentReport = {};
        }
      }
      currentReport = currentReport || { matchId, metadata: {} };

      // Normalisasi field metadata dari schedule
      const date = schedule.matchDate
        ? schedule.matchDate.split("T")[0]
        : (currentReport.metadata?.date || "");

      const streamer = (schedule.streamer ?? currentReport.metadata?.streamer ?? "").trim();
      const streamUrl = (schedule.streamUrl ?? currentReport.metadata?.streamUrl ?? "").trim();
      const referee = (schedule.referee ?? currentReport.metadata?.referee ?? "").trim();
      const streamPlatform =
        schedule.streamPlatform ??
        currentReport.metadata?.streamPlatform ??
        (streamUrl.toLowerCase().includes("tiktok") ? "TikTok" : "YouTube");

      // Audit kondisi isFinished true
      const hasStreamer = streamer !== "" && streamer !== "-";
      const hasUrl = streamUrl !== "" && streamUrl !== "-";
      const hasRef = referee !== "" && referee !== "-";

      if (hasStreamer && !hasUrl) {
        hasStreamerNoUrl.push(matchId);
      }
      if (hasUrl && !hasStreamer) {
        hasUrlNoStreamer.push(matchId);
      }
      if (!hasRef) {
        hasNoReferee.push(matchId);
      }

      // Update metadata report
      currentReport.metadata = {
        ...currentReport.metadata,
        date,
        streamPlatform,
        streamer,
        referee,
        streamUrl,
      };

      updatesToSave[matchId] = currentReport;
      updatedMatches.push(matchId);
    }

    // 2. Simpan kembali ke HASH jika bukan dry-run
    if (!isDryRun && Object.keys(updatesToSave).length > 0) {
      await kv.hset("twi:match_reports", updatesToSave);
    }

    return NextResponse.json({
      success: true,
      mode: isDryRun ? "DRY_RUN (Audit Only, No DB Write)" : "SYNC_SUCCESS",
      summary: {
        totalSchedulesChecked: schedules.length,
        totalFinishedMatched: updatedMatches.length,
        totalSkippedNotFinished: skippedNotFinished.length,
      },
      audit: {
        kriteria: "Kondisi isFinished: true",
        streamerAdaTapiUrlKosong: {
          count: hasStreamerNoUrl.length,
          matches: hasStreamerNoUrl,
        },
        urlAdaTapiStreamerKosong: {
          count: hasUrlNoStreamer.length,
          matches: hasUrlNoStreamer,
        },
        refereeKosong: {
          count: hasNoReferee.length,
          matches: hasNoReferee,
        },
      },
      updatedMatches,
    });
  } catch (error: any) {
    console.error("Error syncing metadata:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Support metode GET untuk memudahkan audit langsung lewat browser / curl
export async function GET(req: Request) {
  return POST(req);
  }
