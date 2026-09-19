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
  streamLink?: string; // Key resmi dari twi:schedules
  streamUrl?: string;  // Fallback jika ada penamaan lama
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
  [key: string]: any;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const isDryRun = url.searchParams.get("dryRun") === "true";

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

    const hasStreamerNoUrl: string[] = [];
    const hasUrlNoStreamer: string[] = [];
    const hasNoReferee: string[] = [];
    const updatedMatches: string[] = [];
    const skippedNotFinished: string[] = [];

    const updatesToSave: Record<string, any> = {};

    for (const schedule of schedules) {
      const matchId = schedule.id;
      if (!matchId) continue;

      // Evaluasi status isFinished
      const isFinished = Boolean(
        schedule.isFinished ||
        (schedule.scoreA !== undefined && schedule.scoreA >= 10) ||
        (schedule.scoreB !== undefined && schedule.scoreB >= 10)
      );

      if (!isFinished) {
        skippedNotFinished.push(matchId);
        continue;
      }

      let currentReport = reportsHash[matchId];
      if (typeof currentReport === "string") {
        try {
          currentReport = JSON.parse(currentReport);
        } catch {
          currentReport = {};
        }
      }
      currentReport = currentReport || { matchId, metadata: {} };

      const date = schedule.matchDate
        ? schedule.matchDate.split("T")[0]
        : (currentReport.metadata?.date || "");

      const streamer = (schedule.streamer ?? currentReport.metadata?.streamer ?? "").trim();
      
      // Mengambil link dari schedule.streamLink (dengan fallback streamUrl)
      const rawUrl = schedule.streamLink ?? schedule.streamUrl ?? currentReport.metadata?.streamUrl ?? "";
      const streamUrl = String(rawUrl).trim();

      const referee = (schedule.referee ?? currentReport.metadata?.referee ?? "").trim();
      
      const streamPlatform =
        schedule.streamPlatform ??
        currentReport.metadata?.streamPlatform ??
        (streamUrl.toLowerCase().includes("tiktok") ? "TikTok" : "YouTube");

      // Validasi kosong
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

      // Metadata di match report tetap menggunakan key streamUrl
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

export async function GET(req: Request) {
  return POST(req);
}
