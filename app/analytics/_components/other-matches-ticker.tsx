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
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
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
        console.error("Gagal sinkron skor match lain:", err);
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
    <div className="w-[360px] select-none space-y-3 font-sans">
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
            className="rounded-3xl border border-slate-200/80 bg-white/95 p-3.5 shadow-md backdrop-blur-md space-y-2.5"
          >
            {/* Header Mini: Match No + Divisi + Status Pill */}
            <div className="flex items-center justify-between text-[11px] font-bold px-1 text-slate-500 border-b border-slate-100 pb-1.5">
              <span className="text-slate-800 font-black">
                {m.id.replace("match-", "MATCH ")}
              </span>
              <span className="text-sky-600 truncate max-w-[140px]">
                {m.groupName || "Group Stage"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono tracking-wider ${
                  isDone
                    ? "bg-slate-100 text-slate-600 border border-slate-200"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}
              >
                {isDone ? "FT" : "LIVE"}
              </span>
            </div>

            {/* Scoreboard Box: Logo A | Skor & Repeat/Warn | Logo B */}
            <div className="flex items-center justify-between px-2">
              {/* Kolom Tim A */}
              <div className="flex flex-col items-center w-24 gap-1.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-xs">
                  {m.teamALogo ? (
                    <img
                      src={m.teamALogo}
                      alt={m.teamAName || "Team A"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-white/50">A</span>
                  )}
                </div>
                <span className="text-[11px] font-black text-slate-900 text-center line-clamp-1 w-full uppercase tracking-tight">
                  {m.teamAName}
                </span>
              </div>

              {/* Box Tengah: Skor & Repeat/Warn persis seperti di Report Scoreboard */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-3 font-mono">
                  <span
                    className={`text-2xl font-black ${
                      aWin ? "text-emerald-600" : "text-slate-900"
                    }`}
                  >
                    {live.scoreA}
                  </span>
                  <span className="text-base font-bold text-slate-300">-</span>
                  <span
                    className={`text-2xl font-black ${
                      bWin ? "text-emerald-600" : "text-slate-900"
                    }`}
                  >
                    {live.scoreB}
                  </span>
                </div>

                {/* Sub-indikator Repeat & Warn */}
                <div className="flex flex-col items-center gap-0.5 mt-1">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                    <span className="text-slate-600">{live.repeatA}/2</span>
                    <span className="text-amber-500 font-extrabold uppercase tracking-widest text-[8px]">REPEAT</span>
                    <span className="text-slate-600">{live.repeatB}/2</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                    <span className="text-slate-600">{live.warnA}/2</span>
                    <span className="text-rose-500 font-extrabold uppercase tracking-widest text-[8px]">WARN</span>
                    <span className="text-slate-600">{live.warnB}/2</span>
                  </div>
                </div>
              </div>

              {/* Kolom Tim B */}
              <div className="flex flex-col items-center w-24 gap-1.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-xs">
                  {m.teamBLogo ? (
                    <img
                      src={m.teamBLogo}
                      alt={m.teamBName || "Team B"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-white/50">B</span>
                  )}
                </div>
                <span className="text-[11px] font-black text-slate-900 text-center line-clamp-1 w-full uppercase tracking-tight">
                  {m.teamBName}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
                            }
          
