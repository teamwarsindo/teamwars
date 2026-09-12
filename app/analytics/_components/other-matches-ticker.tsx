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
    <div className="w-full select-none space-y-2.5 font-sans">
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
            className="w-full rounded-2xl border border-slate-700/60 bg-[#0f172a]/90 px-3.5 py-2.5 shadow-xl backdrop-blur-md space-y-1.5"
          >
            {/* Header Mini: Match No • Grup • Status */}
            <div className="flex items-center justify-between text-[11px] font-bold px-0.5 border-b border-white/10 pb-1">
              <span className="text-white font-black tracking-wide">
                {m.id.replace("match-", "MATCH ")}
              </span>
              <span className="text-sky-400 truncate max-w-[130px]">
                {m.groupName || "Group Stage"}
              </span>
              <span
                className={`px-2 py-0.2 rounded-full text-[9px] font-black font-mono tracking-wider ${
                  isDone
                    ? "bg-white/10 text-white/60 border border-white/10"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                }`}
              >
                {isDone ? "FT" : "LIVE"}
              </span>
            </div>

            {/* Row Utama: [Logo + Nama Tim A] | [Skor & Repeat/Warn] | [Nama Tim B + Logo] */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {/* Sisi Kiri: Logo + Nama Tim A */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-black/70 border border-white/15 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
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
                <span className="text-xs font-black text-white truncate uppercase leading-tight">
                  {m.teamAName}
                </span>
              </div>

              {/* Sisi Tengah: Skor Besar + Repeat/Warn */}
              <div className="flex flex-col items-center justify-center shrink-0 px-1">
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`text-2xl font-black ${
                      aWin ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {live.scoreA}
                  </span>
                  <span className="text-sm font-bold text-white/40">-</span>
                  <span
                    className={`text-2xl font-black ${
                      bWin ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {live.scoreB}
                  </span>
                </div>

                <div className="flex flex-col items-center leading-none mt-0.5">
                  <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                    <span className="text-slate-300">{live.repeatA}/2</span>
                    <span className="text-amber-400 font-black text-[7.5px] tracking-wider">REPEAT</span>
                    <span className="text-slate-300">{live.repeatB}/2</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                    <span className="text-slate-300">{live.warnA}/2</span>
                    <span className="text-rose-400 font-black text-[7.5px] tracking-wider">WARN</span>
                    <span className="text-slate-300">{live.warnB}/2</span>
                  </div>
                </div>
              </div>

              {/* Sisi Kanan: Nama Tim B + Logo */}
              <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                <span className="text-xs font-black text-white truncate uppercase leading-tight">
                  {m.teamBName}
                </span>
                <div className="w-9 h-9 rounded-xl bg-black/70 border border-white/15 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
