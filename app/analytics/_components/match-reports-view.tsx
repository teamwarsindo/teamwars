"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReportFilter, ReportFilterMatchItem } from "./report-filter";
import { ReportScoreboard } from "./report-scoreboard";
import { ReportLineup } from "./report-lineup";
import { ReportLogs } from "./report-logs";
import { ReportSummary } from "./report-summary";

export interface ScheduleItem extends ReportFilterMatchItem {
  matchDate?: string;
  isFinished?: boolean;
  matchNumber?: number | string;
}

export function MatchReportsView({ schedules = [] }: { schedules: ScheduleItem[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  const availableWeeks = useMemo(() => {
    if (!schedules.length) return [];
    return Array.from(new Set(schedules.map((s) => Number(s.weekNumber || 1)))).sort((a, b) => a - b);
  }, [schedules]);

  const initialMatch = useMemo(() => {
    return matchParam && schedules.length ? schedules.find((s) => s.id === matchParam) || null : null;
  }, [schedules, matchParam]);

  const [selectedWeek, setSelectedWeek] = useState<number | "">(initialMatch ? initialMatch.weekNumber : "");
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatch ? initialMatch.id : "");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const matchesInView = useMemo(() => {
    if (!selectedWeek || !schedules.length) return [];
    return schedules.filter((s) => Number(s.weekNumber || 1) === Number(selectedWeek));
  }, [schedules, selectedWeek]);

  const activeSchedule = useMemo(() => schedules.find((s) => s.id === selectedMatchId), [schedules, selectedMatchId]);

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const handleMatchChange = useCallback((newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", newMatchId);
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleReset = () => {
    setSelectedWeek("");
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!selectedMatchId) {
      setReport(null);
      return;
    }

    let isSubscribed = true;

    const fetchReport = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await fetch(`/api/analytics/match-report?matchId=${selectedMatchId}`);
        const json = await res.json();
        if (json.success && json.data && isSubscribed) {
          setReport(json.data);
        } else if (!json.success && isSubscribed) {
          setReport(null);
        }
      } catch (err) {
        console.error("Gagal load match report:", err);
      } finally {
        if (!isSilent && isSubscribed) setLoading(false);
      }
    };

    fetchReport();

    const interval = setInterval(() => {
      if (report && !report.isFinished) {
        fetchReport(true);
      }
    }, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedMatchId, report?.isFinished]);

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];
  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);

  // Parsing Metadata 3-Kolom
  const parsedDate = useMemo(() => {
    const raw = meta.date || activeSchedule?.matchDate;
    if (!raw) return { day: "-", date: "-", time: "-" };
    try {
      const d = new Date(raw);
      const day = d.toLocaleDateString("id-ID", { weekday: "long" });
      const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
      return { day, date, time: time !== "00:00" ? time : "-" };
    } catch {
      return { day: "-", date: raw, time: "-" };
    }
  }, [meta.date, activeSchedule?.matchDate]);

  const liveInstruction = useMemo(() => {
    if (isFinished || !games.length) return null;
    const last = games[games.length - 1];
    const isWinnerA = last.winner === "teamA";
    return {
      nextGameNumber: games.length + 1,
      stayTable: (isWinnerA ? last.playerA?.ign : last.playerB?.ign) || "Pemenang Ronde Sebelumnya",
      nextActionTeam: (isWinnerA ? teamB.name : teamA.name) || "Kubu Lawan",
    };
  }, [isFinished, games, teamA.name, teamB.name]);

  return (
    <div className="w-full space-y-4">
      {/* 1. Filter Dropdown (Maks 4 Item) */}
      <ReportFilter
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        availableWeeks={availableWeeks}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={Boolean(selectedWeek || selectedMatchId)}
        onReset={handleReset}
      />

      {!selectedMatchId ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
          Silakan pilih <strong>Week</strong> dan <strong>Pertandingan</strong> di atas untuk memuat laporan duel.
        </div>
      ) : loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          Memuat laporan pertandingan...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border space-y-1.5">
          <div className="font-bold text-foreground">Pertandingan Belum Dimulai</div>
          <p className="text-[11px] max-w-md mx-auto">
            Wasit belum menginput data duel untuk pertandingan ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 2. Info Match 3 Kolom + Scoreboard Terpadu */}
          <ReportScoreboard
            teamA={teamA}
            teamB={teamB}
            scoreA={scoreA}
            scoreB={scoreB}
            teamALogo={activeSchedule?.teamALogo}
            teamBLogo={activeSchedule?.teamBLogo}
            metadata={{
              matchNumber: activeSchedule?.matchNumber || 1,
              division: activeSchedule?.groupName || meta.division,
              week: selectedWeek || report.week,
              rawDate: meta.date || activeSchedule?.matchDate,
              referee: meta.referee,
              streamer: meta.streamer,
              streamUrl: meta.streamUrl,
            }}
          />

          {/* 3. Lineup Duelist Bersih Tanpa ID */}
          <ReportLineup
            lineupA={teamA.lineup || []}
            lineupB={teamB.lineup || []}
            games={games}
            isFinished={isFinished}
          />

          {/* 4. Game Logs (Skor W vs L, R di Atas, TL di Bawah, Keterangan Nempel di Bawah) */}
          <ReportLogs games={games} />

          {/* 5. Match Summary (50:50 Simetris, Format Bersih Konsisten Kata Player) */}
          <ReportSummary
            games={games}
            isFinished={isFinished}
            scoreA={scoreA}
            scoreB={scoreB}
            liveInstruction={liveInstruction}
          />
        </div>
      )}
    </div>
  );
  }
        
