"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
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
  searchQuery?: string;
  onSelectMatch?: (matchId: string) => void;
}

export function MatchReportsView({
  schedules = [],
  selectedMatchId = "",
  matchesInView = [],
  searchQuery = "",
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

  // Urutkan berdasarkan hari & jam main (matchDate) terbaru, lalu fallback ke id match terbesar
  const sortedMatchesInView = useMemo(() => {
    return [...matchesInView].sort((a, b) => {
      const timeA = a.matchDate ? new Date(a.matchDate).getTime() : 0;
      const timeB = b.matchDate ? new Date(b.matchDate).getTime() : 0;

      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB && timeA > 0 && timeB > 0) {
        return timeB - timeA;
      }

      const numA = Number(String(a.matchNumber || a.id).replace(/\D/g, "")) || 0;
      const numB = Number(String(b.matchNumber || b.id).replace(/\D/g, "")) || 0;
      return numB - numA;
    });
  }, [matchesInView]);

  const isUserSearching = Boolean(searchQuery && searchQuery.trim().length > 0);
  const showMatchList = !selectedMatchId || isUserSearching;

  return (
    <div className="w-full space-y-4">
      {showMatchList ? (
        sortedMatchesInView.length > 0 && onSelectMatch ? (
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Hasil Pertandingan ({sortedMatchesInView.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sortedMatchesInView.map((m) => {
                const stageClean = formatStageName(m.groupName || "");
                const scoreAVal = m.scoreA ?? 0;
                const scoreBVal = m.scoreB ?? 0;
                const aIsLeading = scoreAVal > scoreBVal;
                const bIsLeading = scoreBVal > scoreAVal;
                const winningColor = aIsLeading ? m.teamAColor : bIsLeading ? m.teamBColor : undefined;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMatch(m.id)}
                    className="p-3 rounded-2xl border bg-card/95 backdrop-blur-md hover:border-primary/60 transition shadow-xs cursor-pointer flex flex-col justify-center"
                    style={{
                      borderColor: winningColor ? `${winningColor}88` : undefined,
                      background: winningColor
                        ? `linear-gradient(135deg, ${winningColor}18 0%, var(--card) 60%, var(--card) 100%)`
                        : undefined,
                    }}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
                      {/* Tim A */}
                      <div className="flex flex-col items-center text-center min-w-0">
                        <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow-xs">
                          {m.teamALogo ? (
                            <Image
                              src={m.teamALogo}
                              alt={m.teamAName || "Team A"}
                              fill
                              sizes="48px"
                              className="object-cover rounded-full"
                              unoptimized
                            />
                          ) : (
                            <span className="font-black text-xs text-primary">
                              {m.teamAName?.slice(0, 3).toUpperCase() || "TMA"}
                            </span>
                          )}
                        </div>
                        <div
                          className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1"
                          title={m.teamAName}
                        >
                          {m.teamAName || "Tim A"}
                        </div>
                      </div>

                      {/* Skor & Label Week / Stage */}
                      <div className="flex flex-col items-center justify-center px-2 shrink-0">
                        <div className="flex items-center gap-2 font-mono text-2xl sm:text-3xl font-black leading-none">
                          <span className={aIsLeading ? "text-primary" : "text-foreground/90"}>{scoreAVal}</span>
                          <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl">—</span>
                          <span className={bIsLeading ? "text-primary" : "text-foreground/90"}>{scoreBVal}</span>
                        </div>

                        <div className="mt-1.5 space-y-0.5 text-[9px] w-full max-w-[124px] text-center font-sans">
                          <div className="text-muted-foreground uppercase text-[8px] font-bold tracking-wider leading-tight">
                            Week {m.weekNumber || 1}
                          </div>
                          <div className="text-primary font-bold text-[9px] truncate max-w-[124px] leading-tight" title={stageClean}>
                            {stageClean || "Divisi Official"}
                          </div>
                        </div>
                      </div>

                      {/* Tim B */}
                      <div className="flex flex-col items-center text-center min-w-0">
                        <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow-xs">
                          {m.teamBLogo ? (
                            <Image
                              src={m.teamBLogo}
                              alt={m.teamBName || "Team B"}
                              fill
                              sizes="48px"
                              className="object-cover rounded-full"
                              unoptimized
                            />
                          ) : (
                            <span className="font-black text-xs text-rose-500">
                              {m.teamBName?.slice(0, 3).toUpperCase() || "TMB"}
                            </span>
                          )}
                        </div>
                        <div
                          className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1"
                          title={m.teamBName}
                        >
                          {m.teamBName || "Tim B"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
            {isUserSearching
              ? "Tidak ada pertandingan yang cocok dengan pencarian."
              : "Silakan pilih pertandingan pada filter di atas untuk memuat laporan duel."}
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
