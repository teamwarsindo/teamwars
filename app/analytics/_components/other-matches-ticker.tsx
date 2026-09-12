"use client";

import { useEffect, useState, useMemo } from "react";

interface ScheduleSummary {
  id: string;
  weekNumber?: number | string;
  groupName?: string;
  matchDate?: string;
  teamAName?: string;
  teamBName?: string;
  teamALogo?: string;
  teamBLogo?: string;
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
}

interface LiveMatchData {
  scoreA: number;
  scoreB: number;
  repeatA: number;
  repeatB: number;
  warnA: number;
  warnB: number;
  isFinished: boolean;
}

interface OtherMatchesTickerProps {
  currentMatchId: string;
  schedules: ScheduleSummary[];
}

export function OtherMatchesTicker({
  currentMatchId,
  schedules = [],
}: OtherMatchesTickerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const siblingMatches = useMemo(() => {
    const currentSchedule = schedules.find((s) => s.id === currentMatchId);
    if (!currentSchedule?.matchDate) return [];

    const activeDate = new Date(currentSchedule.matchDate);
    const activeDateStr = activeDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

    return schedules.filter((s) => {
      if (s.id.toLowerCase() === currentMatchId.toLowerCase()) return false;
      if (!s.matchDate) return false;

      const scheduleTime = new Date(s.matchDate);
      const scheduleDateStr = scheduleTime.toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      });

      if (scheduleDateStr !== activeDateStr) return false;

      const diff = now - scheduleTime.getTime();
      return diff <= FIVE_HOURS_MS;
    });
  }, [schedules, currentMatchId, now]);

  const [liveScores, setLiveScores] = useState<Record<string, LiveMatchData>>({});

  useEffect(() => {
    if (!siblingMatches.length) return;

    let isSubscribed = true;

    const fetchOtherScores = async () => {
      try {
        const results = await Promise.all(
          siblingMatches.map(async (m) => {
            const res = await fetch(`/api/analytics/match-report?matchId=${m.id}`);
            const json = await res.json();
            if (json.success && json.data) {
              const d = json.data;
              const sA = d.teamA?.score ?? d.finalScore?.teamA ?? m.scoreA ?? 0;
              const sB = d.teamB?.score ?? d.finalScore?.teamB ?? m.scoreB ?? 0;
              return {
                id: m.id,
                scoreA: sA,
                scoreB: sB,
                repeatA: d.teamA?.repeatCount ?? d.teamA?.repeat ?? 0,
                repeatB: d.teamB?.repeatCount ?? d.teamB?.repeat ?? 0,
                warnA: d.teamA?.warnCount ?? d.teamA?.warn ?? 0,
                warnB: d.teamB?.warnCount ?? d.teamB?.warn ?? 0,
                isFinished: d.isFinished ?? (sA >= 10 || sB >= 10),
              };
            }
            const sA = m.scoreA ?? 0;
            const sB = m.scoreB ?? 0;
            return {
              id: m.id,
              scoreA: sA,
              scoreB: sB,
              repeatA: 0,
              repeatB: 0,
              warnA: 0,
              warnB: 0,
              isFinished: m.isFinished ?? (sA >= 10 || sB >= 10),
            };
          })
        );

        if (isSubscribed) {
          const map: Record<string, LiveMatchData> = {};
          results.forEach((r) => {
            map[r.id] = {
              scoreA: r.scoreA,
              scoreB: r.scoreB,
              repeatA: r.repeatA,
              repeatB: r.repeatB,
              warnA: r.warnA,
              warnB: r.warnB,
              isFinished: r.isFinished,
            };
          });
          setLiveScores(map);
        }
      } catch (err) {
        console.error("Gagal sinkron skor:", err);
      }
    };

    fetchOtherScores();

    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchOtherScores();
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [siblingMatches]);

  if (siblingMatches.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-3 font-sans select-none p-1">
      {siblingMatches.map((m) => {
        const live = liveScores[m.id] || {
          scoreA: m.scoreA ?? 0,
          scoreB: m.scoreB ?? 0,
          repeatA: 0,
          repeatB: 0,
          warnA: 0,
          warnB: 0,
          isFinished: m.isFinished ?? false,
        };

        const aWin = live.scoreA >= 10;
        const bWin = live.scoreB >= 10;
        const isDone = live.isFinished || aWin || bWin;

        return (
          <div
            key={m.id}
            className="w-full rounded-xl bg-slate-950/95 border border-red-500/30 shadow-2xl p-3 flex flex-col gap-2 backdrop-blur-md"
          >
            {/* Header: MATCH ID & STATUS */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-white">
                  {m.id.replace("match-", "MATCH ")}
                </span>
                <span className="text-[10px] text-cyan-400 font-bold truncate max-w-[140px]">
                  {m.groupName || "GROUP STAGE"}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-black font-mono tracking-wider ${
                  isDone
                    ? "bg-white/10 text-white/60"
                    : "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                }`}
              >
                {isDone ? "FT" : "LIVE"}
              </span>
            </div>

            {/* Tim A (Row Atas) */}
            <div className="flex items-center justify-between gap-2 bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-black/80 border border-white/15 p-0.5 flex items-center justify-center shrink-0">
                  {m.teamALogo ? (
                    <img src={m.teamALogo} alt={m.teamAName || "A"} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-black text-white/40">A</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white truncate uppercase tracking-tight">
                    {m.teamAName}
                  </span>
                  <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-white/50">
                    <span>R: {live.repeatA}/2</span>
                    <span>W: {live.warnA}/2</span>
                  </div>
                </div>
              </div>

              {/* Skor Tim A */}
              <div
                className={`w-9 h-8 rounded-md flex items-center justify-center font-mono text-lg font-black shrink-0 ${
                  aWin
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-black/60 text-white border border-white/15"
                }`}
              >
                {live.scoreA}
              </div>
            </div>

            {/* Tim B (Row Bawah) */}
            <div className="flex items-center justify-between gap-2 bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-black/80 border border-white/15 p-0.5 flex items-center justify-center shrink-0">
                  {m.teamBLogo ? (
                    <img src={m.teamBLogo} alt={m.teamBName || "B"} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-black text-white/40">B</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white truncate uppercase tracking-tight">
                    {m.teamBName}
                  </span>
                  <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-white/50">
                    <span>R: {live.repeatB}/2</span>
                    <span>W: {live.warnB}/2</span>
                  </div>
                </div>
              </div>

              {/* Skor Tim B */}
              <div
                className={`w-9 h-8 rounded-md flex items-center justify-center font-mono text-lg font-black shrink-0 ${
                  bWin
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-black/60 text-white border border-white/15"
                }`}
              >
                {live.scoreB}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
