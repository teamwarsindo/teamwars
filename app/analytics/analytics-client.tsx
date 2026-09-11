"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { MatchReportsView, ScheduleItem } from "./_components/match-reports-view";
// Import tab lain milikmu (misal: LeaderboardView, DeckStatsView) tetap seperti biasa

interface AnalyticsClientContentProps {
  isAdmin: boolean;
  schedules: ScheduleItem[];
}

export default function AnalyticsClientContent({
  isAdmin,
  schedules = [],
}: AnalyticsClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") || "reports";

  const handleTabChange = (tabKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabKey);
    // Hapus match query jika pindah tab di luar reports
    if (tabKey !== "reports") params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange("reports")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            currentTab === "reports"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Match Reports
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("leaderboard")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            currentTab === "leaderboard"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Klasemen
        </button>
      </div>

      {/* Konten Tab Terpilih */}
      {currentTab === "reports" && <MatchReportsView schedules={schedules} />}
      {currentTab === "leaderboard" && (
        <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
          Tampilan Klasemen Turnamen
        </div>
      )}
    </div>
  );
}
