"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Shield } from "lucide-react";
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

  const sortedMatchesInView = useMemo(() => {
    return [...matchesInView].sort((a, b) => {
      const weekA = Number(a.weekNumber || 1);
      const weekB = Number(b.weekNumber || 1);
      if (weekB !== weekA) return weekB - weekA;

      const numA = Number(String(a.matchNumber || a.id).replace(/\D/g, "")) || 0;
      const numB = Number(String(b.matchNumber || b.id).replace(/\D/g, "")) || 0;
      return numB - numA;
    });
  }, [matchesInView]);

  return (
    <div className="w-full space-y-4">
      {!selectedMatchId ? (
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
                const isFinishedMatch = Boolean(m.isFinished || scoreAVal >= 10 || scoreBVal >= 10);

                const isWinnerA = isFinishedMatch && scoreAVal > scoreBVal;
                const isWinnerB = isFinishedMatch && scoreBVal > scoreAVal;
                const winningColor = isWinnerA
                  ? m.teamAColor
                  : isWinnerB
                  ? m.teamBColor
                  : undefined;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMatch(m.id)}
                    className="p-3 rounded-2xl border bg-card hover:border-primary/60 transition shadow-xs cursor-pointer flex flex-col justify-center"
                    style={{
                      borderColor: winningColor ? `${winningColor}88` : undefined,
                      background: winningColor
                        ? `linear-gradient(135deg, ${winningColor}18 0%, var(--card) 60%, var(--card) 100%)`
                        : undefined,
                    }}
                  >
                    {/* Baris Utama: Tim A | Skor & Info Baris Terpisah | Tim B */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
                      {/* Kubu Tim A */}
                      <div className="flex flex-col items-center text-center gap-1 min-w-0">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-border/60">
                          {m.teamALogo ? (
                            <Image
                              src={m.teamALogo}
                              alt={m.teamAName || "Team A"}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-bold text-[11px] sm:text-xs text-foreground leading-tight line-clamp-2 w-full">
                          {m.teamAName}
                        </span>
                      </div>

                      {/* Kolom Tengah: Skor & Pemisah Baris (Week & Group) */}
                      <div className="flex flex-col items-center justify-center px-1">
                        {/* Angka Skor */}
                        <div className="font-mono text-base sm:text-lg tracking-tight font-black flex items-center gap-1.5">
                          <span className={isFinishedMatch ? (isWinnerA ? "text-emerald-500" : "text-rose-500") : "text-foreground"}>
                            {scoreAVal}
                          </span>
                          <span className="text-muted-foreground text-xs font-normal">-</span>
                          <span className={isFinishedMatch ? (isWinnerB ? "text-emerald-500" : "text-rose-500") : "text-foreground"}>
                            {scoreBVal}
                          </span>
                        </div>

                        {/* Baris 1: Week (Menggantikan posisi REPEAT) */}
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 leading-none">
                          Week {m.weekNumber}
                        </span>

                        {/* Baris 2: Stage / Group (Menggantikan posisi WARN) */}
                        <span className="text-[9.5px] font-extrabold text-primary truncate max-w-[120px] text-center mt-0.5 leading-none">
                          {stageClean}
                        </span>
                      </div>

                      {/* Kubu Tim B */}
                      <div className="flex flex-col items-center text-center gap-1 min-w-0">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-border/60">
                          {m.teamBLogo ? (
                            <Image
                              src={m.teamBLogo}
                              alt={m.teamBName || "Team B"}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-bold text-[11px] sm:text-xs text-foreground leading-tight line-clamp-2 w-full">
                          {m.teamBName}
                        </span>
                      </div>
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
