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

  const [liveScores, setLiveScores] = useState<
    Record<string, { scoreA: number; scoreB: number; isFinished: boolean }>
  >({});

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
                isFinished: d.isFinished ?? (sA >= 10 || sB >= 10),
              };
            }
            const sA = m.scoreA ?? 0;
            const sB = m.scoreB ?? 0;
            return {
              id: m.id,
              scoreA: sA,
              scoreB: sB,
              isFinished: m.isFinished ?? (sA >= 10 || sB >= 10),
            };
          })
        );

        if (isSubscribed) {
          const map: Record<string, { scoreA: number; scoreB: number; isFinished: boolean }> = {};
          results.forEach((r) => {
            map[r.id] = { scoreA: r.scoreA, scoreB: r.scoreB, isFinished: r.isFinished };
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
    <div className="w-[360px] select-none rounded-2xl border border-slate-200/80 bg-white/95 text-slate-900 p-3.5 shadow-xl backdrop-blur-md space-y-3 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            OTHER MATCHES
          </span>
        </div>
        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
          CONCURRENT LIVE
        </span>
      </div>

      {/* List Card Tiap Match */}
      <div className="space-y-2.5">
        {siblingMatches.map((m) => {
          const live = liveScores[m.id] || {
            scoreA: m.scoreA ?? 0,
            scoreB: m.scoreB ?? 0,
            isFinished: m.isFinished ?? false,
          };

          const aWin = live.scoreA >= 10;
          const bWin = live.scoreB >= 10;
          const isDone = live.isFinished || aWin || bWin;

          return (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 shadow-xs hover:border-slate-300 transition flex flex-col gap-2"
            >
              {/* Header Match (MATCH 41 • Group Name • Status) */}
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/50 pb-1">
                <span className="text-slate-700 font-black">{m.id.replace("match-", "MATCH ")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 truncate max-w-[130px]">
                    {m.groupName || "Group Stage"}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black font-mono ${
                      isDone
                        ? "bg-slate-200 text-slate-600"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    }`}
                  >
                    {isDone ? "FT" : "LIVE"}
                  </span>
                </div>
              </div>

              {/* Baris Tim A */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {m.teamALogo ? (
                      <img
                        src={m.teamALogo}
                        alt={m.teamAName || "Team A"}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400">A</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 tracking-wide truncate">
                    {m.teamAName}
                  </span>
                </div>

                <span
                  className={`font-mono text-base font-black px-2.5 py-0.5 rounded-md min-w-[32px] text-center ${
                    aWin
                      ? "text-emerald-700 bg-emerald-100 border border-emerald-300"
                      : "text-slate-900 bg-white border border-slate-200 shadow-2xs"
                  }`}
                >
                  {live.scoreA}
                </span>
              </div>

              {/* Baris Tim B */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {m.teamBLogo ? (
                      <img
                        src={m.teamBLogo}
                        alt={m.teamBName || "Team B"}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400">B</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 tracking-wide truncate">
                    {m.teamBName}
                  </span>
                </div>

                <span
                  className={`font-mono text-base font-black px-2.5 py-0.5 rounded-md min-w-[32px] text-center ${
                    bWin
                      ? "text-emerald-700 bg-emerald-100 border border-emerald-300"
                      : "text-slate-900 bg-white border border-slate-200 shadow-2xs"
                  }`}
                >
                  {live.scoreB}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
            }
