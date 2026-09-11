"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MatchReportsView } from "./_components/match-reports-view";

export type AnalyticsTab = "reports" | "decks" | "leaderboard";

interface AnalyticsClientProps {
  isAdmin: boolean;
  schedules?: any[];
}

export default function AnalyticsClientContent({ isAdmin, schedules = [] }: AnalyticsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as AnalyticsTab | null;

  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    tabParam === "decks" || tabParam === "leaderboard" ? tabParam : "reports"
  );

  // Sinkronisasi Tab ke Query Parameter URL
  const handleTabChange = (newTab: AnalyticsTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    if (newTab !== "reports") {
      params.delete("match");
    }
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. NAVIGASI 3 SUB-TAB */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full bg-muted/40 p-1 border border-border/40 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => handleTabChange("reports")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Match Reports
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("decks")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "decks"
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Deck Stats
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("leaderboard")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "leaderboard"
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* 2. KONTEN MASING-MASING TAB DENGAN DATA PROPS */}
      {activeTab === "reports" && <MatchReportsView schedules={schedules} />}

      {activeTab === "decks" && (
        <div className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-sm shadow-sm text-center py-16 space-y-2">
          <div className="text-xs font-black uppercase text-primary tracking-wider">
            Deck Stats &amp; Metagame
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Analisis pick rate, win rate archetype, serta distribusi skill terpopuler sedang diproses.
          </p>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-sm shadow-sm text-center py-16 space-y-2">
          <div className="text-xs font-black uppercase text-primary tracking-wider">
            Player Leaderboard
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Peringkat MVP duelist, rekor killstreak, dan performa tim individu akan segera hadir.
          </p>
        </div>
      )}
    </div>
  );
}
