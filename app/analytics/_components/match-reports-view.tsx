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
  teamALogo?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
}

interface MatchReportsViewProps {
  schedules?: ScheduleItem[];
  isOverlayMode?: boolean;
}

export function MatchReportsView({
  schedules = [],
  isOverlayMode = false,
}: MatchReportsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  // Pekan aktif tertinggi (berdasarkan match yang sudah selesai)
  const maxActiveWeek = useMemo(() => {
    return schedules.reduce((max, s) => {
      const w = Number(s.weekNumber || 1);
      return s.isFinished && w > max ? w : max;
    }, 1);
  }, [schedules]);

  // Pembatasan jadwal: Maksimal sampai pekan aktif saat ini
  const validSchedules = useMemo(() => {
    return schedules.filter((s) => Number(s.weekNumber || 1) <= maxActiveWeek);
  }, [schedules, maxActiveWeek]);

  const availableWeeks = useMemo(() => {
    if (!validSchedules.length) return [];
    return Array.from(new Set(validSchedules.map((s) => Number(s.weekNumber || 1)))).sort((a, b) => a - b);
  }, [validSchedules]);

  const initialMatch = useMemo(() => {
    return matchParam && validSchedules.length
      ? validSchedules.find((s) => s.id === matchParam) || null
      : null;
  }, [validSchedules, matchParam]);

  const [selectedWeek, setSelectedWeek] = useState<number | "">(
    initialMatch ? Number(initialMatch.weekNumber) : ""
  );
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialMatch ? initialMatch.id : ""
  );
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    validSchedules.forEach((s) => {
      if (s.teamAName) teams.add(s.teamAName);
      if (s.teamBName) teams.add(s.teamBName);
    });
    return Array.from(teams).sort();
  }, [validSchedules]);

  const matchesInView = useMemo(() => {
    return validSchedules.filter((s) => {
      const matchWeek =
        selectedWeek === "" || Number(s.weekNumber || 1) === Number(selectedWeek);
      const matchTeam =
        selectedTeam === "" ||
        s.teamAName?.toLowerCase() === selectedTeam.toLowerCase() ||
        s.teamBName?.toLowerCase() === selectedTeam.toLowerCase();
      return matchWeek && matchTeam;
    });
  }, [validSchedules, selectedWeek, selectedTeam]);

  // Auto-select jika hasil filter tinggal 1 match
  useEffect(() => {
    if (matchesInView.length === 1 && matchesInView[0].id !== selectedMatchId) {
      handleMatchChange(matchesInView[0].id);
    }
  }, [matchesInView, selectedMatchId]);

  const activeSchedule = useMemo(
    () => validSchedules.find((s) => s.id === selectedMatchId),
    [validSchedules, selectedMatchId]
  );

  const handleWeekChange = (week: number | "") => {
    setSelectedWeek(week);
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const handleTeamChange = (team: string) => {
    setSelectedTeam(team);
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const handleMatchChange = useCallback(
    (newMatchId: string) => {
      setSelectedMatchId(newMatchId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reports");
      params.set("match", newMatchId);
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleReset = () => {
    setSelectedWeek("");
    setSelectedTeam("");
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];
  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? activeSchedule?.scoreA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? activeSchedule?.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);
  const isMatchStarted = games.length > 0 || scoreA > 0 || scoreB > 0;

  // Auto Polling hemat resource Vercel
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

  const isFilterActive = Boolean(selectedWeek !== "" || selectedTeam || selectedMatchId);

  // ── MODE OVERLAY STREAM (OBS) ──
  if (isOverlayMode) {
    const recentGames = [...games].slice(-3).reverse();

    return (
      <div className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-slate-950/90 text-white p-3.5 shadow-2xl backdrop-blur-md space-y-3 font-sans">
        {/* Scoreboard Ringkas */}
        <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-center min-w-0">
              <div className="text-xs font-black uppercase tracking-wider truncate text-sky-400">
                {teamA.name || activeSchedule?.teamAName || "Team A"}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-black/60 rounded-lg border border-white/10 font-mono">
              <span
                className={`text-xl font-black ${
                  scoreA >= 10 ? "text-emerald-400" : scoreA > scoreB ? "text-white" : "text-white/70"
                }`}
              >
                {scoreA}
              </span>
              <span className="text-xs text-white/40 font-bold">-</span>
              <span
                className={`text-xl font-black ${
                  scoreB >= 10 ? "text-emerald-400" : scoreB > scoreA ? "text-white" : "text-white/70"
                }`}
              >
                {scoreB}
              </span>
            </div>

            <div className="flex-1 text-center min-w-0">
              <div className="text-xs font-black uppercase tracking-wider truncate text-rose-400">
                {teamB.name || activeSchedule?.teamBName || "Team B"}
              </div>
            </div>
          </div>

          <div className="text-center mt-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80">
              {isFinished
                ? "MATCH SELESAI"
                : games.length === 0
                ? "MENUNGGU RONDE PERTAMA"
                : `GAME ${games.length + 1} LIVE`}
            </span>
          </div>
        </div>

        {/* Riwayat 3 Duel Terakhir */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/50 px-1">
            Recent Duels
          </div>

          {recentGames.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-white/40 italic bg-white/5 rounded-xl border border-white/5">
              Menunggu wasit menginput ronde...
            </div>
          ) : (
            recentGames.map((g, idx) => {
              const isAWin = g.winner === "teamA";
              const actualGameNum = games.length - idx;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-bold truncate text-white">{g.playerA?.ign || "-"}</div>
                    <div className="text-[9px] text-white/60 truncate">{g.playerA?.archetype || "-"}</div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                        isAWin
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isAWin ? "W" : "L"}
                    </span>
                    <span className="text-[9px] font-mono text-white/40">G{actualGameNum}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                        !isAWin
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {!isAWin ? "W" : "L"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-bold truncate text-white">{g.playerB?.ign || "-"}</div>
                    <div className="text-[9px] text-white/60 truncate">{g.playerB?.archetype || "-"}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── MODE NORMAL WEB ──
  return (
    <div className="w-full space-y-4">
      <ReportFilter
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        availableWeeks={availableWeeks}
        selectedTeam={selectedTeam}
        onTeamChange={handleTeamChange}
        availableTeams={availableTeams}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {!selectedMatchId ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
          Silakan pilih pertandingan di atas untuk memuat laporan duel.
        </div>
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
              division: activeSchedule?.groupName || meta.division,
              week: activeSchedule?.weekNumber || selectedWeek || report?.week,
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
