"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export type AnalyticsTab = "reports" | "decks" | "leaderboard";

export default function AnalyticsClientContent({ isAdmin }: { isAdmin: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as AnalyticsTab | null;
  const initialMatchId = searchParams.get("match") || "";

  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    tabParam === "decks" || tabParam === "leaderboard" ? tabParam : "reports"
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatchId);

  // Sinkronisasi Tab ke URL
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
      {/* NAVIGASI 3 SUB-TAB */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border">
          <button
            onClick={() => handleTabChange("reports")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Match Reports
          </button>
          <button
            onClick={() => handleTabChange("decks")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "decks"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Deck Stats
          </button>
          <button
            onClick={() => handleTabChange("leaderboard")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "leaderboard"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* KONTEN MASING-MASING TAB */}
      {activeTab === "reports" && (
        <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 backdrop-blur-sm shadow-sm">
          {/* Komponen MatchReportsView dengan live polling & filter match akan diletakkan di sini */}
          <div className="text-center py-10 space-y-2">
            <div className="text-xs font-black uppercase text-primary tracking-wider">
              Match Reports Hub
            </div>
            <p className="text-xs text-muted-foreground">
              Menampilkan live duel update dan arsip laporan pertandingan.
            </p>
          </div>
        </div>
      )}

      {activeTab === "decks" && (
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm shadow-sm text-center py-12">
          <span className="text-xs font-black uppercase text-primary tracking-wider block mb-1">
            Metagame Analysis
          </span>
          <p className="text-xs text-muted-foreground">
            Data Deck Stats & Winrate sedang disiapkan.
          </p>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm shadow-sm text-center py-12">
          <span className="text-xs font-black uppercase text-primary tracking-wider block mb-1">
            Player Rankings
          </span>
          <p className="text-xs text-muted-foreground">
            Peringkat MVP dan rekor duelist teratas sedang diproses.
          </p>
        </div>
      )}
    </div>
  );
}
