"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

interface ScheduleSummary {
  id: string;
  weekNumber: number | string;
  groupName?: string;
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
  currentWeek: number | string;
  schedules: ScheduleSummary[];
}

export function OtherMatchesTicker({
  currentMatchId,
  currentWeek,
  schedules,
}: OtherMatchesTickerProps) {
  // Ambil match lain di week yang sama
  const siblingMatches = useMemo(() => {
    return schedules.filter(
      (s) =>
        s.id !== currentMatchId &&
        String(s.weekNumber) === String(currentWeek)
    );
  }, [schedules, currentMatchId, currentWeek]);

  const [liveScores, setLiveScores] = useState<
    Record<string, { scoreA: number; scoreB: number; isFinished: boolean }>
  >({});

  // Polling tiap 8-10 detik untuk ambil update skor match lain
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
              return {
                id: m.id,
                scoreA: d.teamA?.score ?? d.finalScore?.teamA ?? m.scoreA ?? 0,
                scoreB: d.teamB?.score ?? d.finalScore?.teamB ?? m.scoreB ?? 0,
                isFinished: d.isFinished ?? false,
              };
            }
            return {
              id: m.id,
              scoreA: m.scoreA ?? 0,
              scoreB: m.scoreB ?? 0,
              isFinished: m.isFinished ?? false,
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
    <div className="w-full max-w-[320px] rounded-2xl border border-white/15 bg-slate-950/90 text-white p-3 shadow-2xl backdrop-blur-md space-y-2 font-sans">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
            Other Matches
          </span>
        </div>
        <span className="text-[9px] font-bold text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
          Week {currentWeek}
        </span>
      </div>

      {/* Grid Match Berdasarkan Logo */}
      <div className="space-y-2">
        {siblingMatches.map((m) => {
          const live = liveScores[m.id] || {
            scoreA: m.scoreA ?? 0,
            scoreB: m.scoreB ?? 0,
            isFinished: m.isFinished ?? false,
          };

          const aWin = live.scoreA >= 10;
          const bWin = live.scoreB >= 10;

          return (
            <div
              key={m.id}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5 hover:bg-white/10 transition"
            >
              {/* Header Match Kecil */}
              <div className="flex justify-between items-center text-[9px] font-bold text-white/40 uppercase px-0.5">
                <span>{m.id.replace("match-", "M")}</span>
                <span className="truncate max-w-[150px]">{m.groupName || "Group Stage"}</span>
              </div>

              {/* Box Logo vs Logo + Skor Tengah */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* Tim A Logo & Singkatan */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {m.teamALogo ? (
                      <img
                        src={m.teamALogo}
                        alt={m.teamAName || "Team A"}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[9px] font-black text-white/40">A</span>
                    )}
                  </div>
                  <span className="text-xs font-bold truncate text-white/90">
                    {m.teamAName}
                  </span>
                </div>

                {/* Skor Tengah Jumbo */}
                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 font-mono shrink-0">
                  <span
                    className={`text-base font-black ${
                      aWin
                        ? "text-emerald-400"
                        : bWin
                        ? "text-rose-400"
                        : "text-white"
                    }`}
                  >
                    {live.scoreA}
                  </span>
                  <span className="text-xs text-white/30 font-bold">:</span>
                  <span
                    className={`text-base font-black ${
                      bWin
                        ? "text-emerald-400"
                        : aWin
                        ? "text-rose-400"
                        : "text-white"
                    }`}
                  >
                    {live.scoreB}
                  </span>
                </div>

                {/* Tim B Logo & Singkatan */}
                <div className="flex items-center justify-end gap-2 min-w-0">
                  <span className="text-xs font-bold truncate text-white/90 text-right">
                    {m.teamBName}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {m.teamBLogo ? (
                      <img
                        src={m.teamBLogo}
                        alt={m.teamBName || "Team B"}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[9px] font-black text-white/40">B</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
    }
