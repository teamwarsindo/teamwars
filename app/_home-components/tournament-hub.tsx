"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ScheduleTab } from "@/app/tournament/_components/schedule-tab";
import { StandingTab } from "@/app/tournament/_components/standing-tab";
import { PlayoffTab } from "@/app/tournament/_components/playoff-tab";
import { MatchH2HModal } from "@/app/_home-components/match-h2h-modal";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
} from "@/app/tournament/_library";
import { Calendar, Trophy, GitBranch, Loader2 } from "lucide-react";

export function TournamentHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);

  const defaultWeek = useMemo(() => getCurrentServerWeek(), []);
  const activeTab = searchParams.get("tab") || "schedule";

  const setTab = (tab: "schedule" | "standings" | "playoff") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Fetch data secara internal untuk halaman beranda
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetch("/api/tournament/schedule").then((res) => res.json()).catch(() => ({ data: [] })),
      fetch("/api/tournament/teams").then((res) => res.json()).catch(() => ({ data: [] })),
    ])
      .then(([schedRes, teamRes]) => {
        if (!isMounted) return;
        const fetchedSchedules = schedRes?.data || schedRes?.schedules || [];
        const fetchedTeams = teamRes?.data || teamRes?.teams || [];
        setSchedules(Array.isArray(fetchedSchedules) ? fetchedSchedules : []);
        setMasterTeams(Array.isArray(fetchedTeams) ? fetchedTeams : []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const allWeeks = useMemo(() => {
    const weeks = Array.from(new Set(schedules.map((s) => s.weekNumber || 1))).sort((a, b) => a - b);
    return weeks.length > 0 ? weeks : [1, 2, 3, 4, 5, 6, 7];
  }, [schedules]);

  const allTeamNames = useMemo(() => {
    return Array.from(
      new Set([
        ...masterTeams.map((t) => t.name || t.teamName).filter(Boolean),
        ...schedules.map((s) => s.teamAName).filter(Boolean),
        ...schedules.map((s) => s.teamBName).filter(Boolean),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [masterTeams, schedules]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs md:text-sm font-medium">Memuat data turnamen...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
      {/* 3 TAB UTAMA TURNAMEN */}
      <div className="grid grid-cols-3 gap-2 max-w-xl md:max-w-2xl mx-auto bg-card border border-border p-1.5 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setTab("schedule")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "schedule"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Group Stage</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("standings")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "standings"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Klasemen</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("playoff")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "playoff"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Playoff</span>
        </button>
      </div>

      {/* KONTEN AKTIF */}
      <div className="w-full">
        {activeTab === "schedule" && (
          <ScheduleTab
            schedules={schedules}
            allTeamNames={allTeamNames}
            allWeeks={allWeeks}
            isAdmin={false}
            onResetSchedules={() => {}}
            onSelectMatch={(m) => setSelectedMatch(m)}
            defaultWeek={defaultWeek}
          />
        )}

        {activeTab === "standings" && (
          <StandingTab
            schedules={schedules}
            masterTeams={masterTeams}
          />
        )}

        {activeTab === "playoff" && (
          <PlayoffTab
            schedules={schedules}
            masterTeams={masterTeams}
            groupAName={DIVISION_MAP.GROUP_A}
            groupBName={DIVISION_MAP.GROUP_B}
          />
        )}
      </div>

      {/* MODAL H2H */}
      <MatchH2HModal
        match={selectedMatch}
        currentWeek={defaultWeek}
        allSchedules={schedules}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
                  }
      
