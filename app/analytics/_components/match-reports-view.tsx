"use client";

import { useEffect, useState, useMemo } from "react";
import { formatStageName } from "@/app/tournament/_library/utils";
import { ReportScoreboard } from "./report-scoreboard";
import { ReportLineup } from "./report-lineup";
import { ReportLogs } from "./report-logs";
import { ReportSummary } from "./report-summary";

export interface ScheduleItem {
  id: string;
  weekNumber: number | string;
  groupName?: string;
  teamAName?: string;
  teamBName?: string;
  teamALogo?: string;
  teamBLogo?: string;
  teamAColor?: string;
  teamBColor?: string;
  matchDate?: string;
  matchNumber?: number | string;
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
}

interface MatchReportsViewProps {
  schedules?: ScheduleItem[];
  selectedMatchId?: string;
  matchesInView?: ScheduleItem[];
  onSelectMatch?: (matchId: string) => void;
}

export function MatchReportsView({
  schedules = [],
  selectedMatchId = "",
  matchesInView = [],
  onSelectMatch,
}: MatchReportsViewProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.id === selectedMatchId),
    [schedules, selectedMatchId]
  );

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];
  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? activeSchedule?.scoreA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? activeSchedule?.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);
  const isMatchStarted = games.length > 0 || scoreA > 0 || scoreB > 0;

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
        console.error("Gagal memuat detail match report:", err);
      } finally {
        if (!isSilent && isSubscribed) setLoading(false);
      }
    };

    fetchReport();

    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!isFinished) {
        fetchReport(true);
      }
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedMatchId, isFinished]);

  const scheduleDateInfo = useMemo(() => {
    const raw = activeSchedule?.matchDate;
    if (!raw) return { day: "-", date: "-", time: "-" };
    try {
      const d = new Date(raw);
      const day = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(d);
      const date = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
      const timeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(d);
      return { day, date, time: `${timeStr.replace(":", ".")} WIB` };
    } catch {
      return { day: "-", date: raw, time: "-" };
    }
  }, [activeSchedule?.matchDate]);

  const resolvedMatchNumber = useMemo(() => {
    if (activeSchedule?.matchNumber) return activeSchedule.matchNumber;
    if (selectedMatchId) {
      const extracted = selectedMatchId.replace(/\D/g, "");
      if (extracted) return extracted;
    }
    return 1;
  }, [activeSchedule?.matchNumber, selectedMatchId]);

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

  const rawDivision = activeSchedule?.groupName || meta.division || "";
  const standardizedDivision = formatStageName(rawDivision);

  return (
    <div className="w-full space-y-4">
      {!selectedMatchId ? (
        matchesInView.length > 0 && onSelectMatch ? (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Hasil Pertandingan ({matchesInView.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchesInView.map((m) => {
                const stageClean = formatStageName(m.groupName || "");
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMatch(m.id)}
                    className="flex flex-col p-3 rounded-xl border border-border bg-card hover:border-primary/60 transition text-left gap-1.5 shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Week {m.weekNumber}</span>
                      <span className="text-primary font-bold">{stageClean}</span>
                    </div>
                    <div className="flex items-center justify-between font-extrabold text-xs text-foreground">
                      <span className="truncate flex-1">{m.teamAName}</span>
                      <span className="px-2 font-mono text-[11px]">
                        {m.scoreA ?? 0} - {m.scoreB ?? 0}
                      </span>
                      <span className="truncate flex-1 text-right">{m.teamBName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
            Silakan pilih pertandingan pada filter di atas untuk memuat laporan duel.
          </div>
        )
      ) : loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          Memuat laporan pertandingan...
        </div>
      ) : (
        <>
          <ReportScoreboard
            teamA={teamA.name ? teamA : { name: activeSchedule?.teamAName }}
            teamB={teamB.name ? teamB : { name: activeSchedule?.teamBName }}
            scoreA={scoreA}
            scoreB={scoreB}
            teamALogo={activeSchedule?.teamALogo}
            teamBLogo={activeSchedule?.teamBLogo}
            metadata={{
              matchNumber: resolvedMatchNumber,
              division: standardizedDivision,
              week: activeSchedule?.weekNumber || report?.week,
              day: scheduleDateInfo.day,
              date: scheduleDateInfo.date,
              time: scheduleDateInfo.time,
              referee: meta.referee,
              streamer: meta.streamer,
              streamUrl: meta.streamUrl,
            }}
          />

          <ReportLineup
            lineupA={teamA.lineup || []}
            lineupB={teamB.lineup || []}
            games={games}
            isFinished={isFinished}
            isMatchStarted={isMatchStarted}
          />

          <ReportLogs
            games={games}
            isFinished={isFinished}
            isMatchStarted={isMatchStarted}
          />

          <ReportSummary
            games={games}
            isFinished={isFinished}
            scoreA={scoreA}
            scoreB={scoreB}
            liveInstruction={liveInstruction}
          />
        </>
      )}
    </div>
  );
}
