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
  // State waktu sekarang untuk mengevaluasi jendela batas 5 jam
  const [now, setNow] = useState<number>(() => Date.now());

  // Update counter waktu tiap 1 menit
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter match:
  // 1. Bukan match yang sedang dibuka/di-stream
  // 2. Berasal dari sesi tanggal yang sama dengan match aktif
  // 3. Waktu sekarang belum melewati 5 jam dari jadwal tanding
  const siblingMatches = useMemo(() => {
    const currentSchedule = schedules.find((s) => s.id === currentMatchId);
    if (!currentSchedule?.matchDate) return [];

    // Ambil tanggal match aktif (Basis: Asia/Jakarta)
    const activeMatchDate = new Date(currentSchedule.matchDate);
    const activeDateStr = activeMatchDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

    return schedules.filter((s) => {
      if (s.id === currentMatchId || !s.matchDate) return false;

      const scheduleTime = new Date(s.matchDate);
      const scheduleDateStr = scheduleTime.toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      });

      // Harus di sesi tanggal yang sama
      if (scheduleDateStr !== activeDateStr) return false;

      // Batasi maksimal 5 jam dari jam mulai tanding
      const diff = now - scheduleTime.getTime();
      return diff <= FIVE_HOURS_MS;
    });
  }, [schedules, currentMatchId, now]);

  const [liveScores, setLiveScores] = useState<
    Record<string, { scoreA: number; scoreB: number; isFinished: boolean }>
  >({});

  // Polling tiap 8 detik untuk update skor match lain
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
            const defaultSA = m.scoreA ?? 0;
            const defaultSB = m.scoreB ?? 0;
            return {
              id: m.id,
              scoreA: defaultSA,
              scoreB: defaultSB,
              isFinished: m.isFinished ?? (defaultSA >= 10 || defaultSB >= 10),
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
          Concurrent Live
        </span>
      </div>

      {/* Daftar Match Lain */}
      <div className="space-y-2">
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
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5 hover:bg-white/10 transition"
            >
              {/* Header Info Match */}
              <div className="flex justify-between items-center text-[9px] font-bold uppercase px-0.5">
                <span className="text-white/50">{m.id.replace("match-", "M")}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-white/40 truncate max-w-[130px]">
                    {m.groupName || "Group Stage"}
                  </span>
                  <span
                    className={`px-1 py-0.2 rounded text-[8px] font-black ${
                      isDone
                        ? "bg-white/10 text-white/60"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isDone ? "FT" : "LIVE"}
                  </span>
                </div>
              </div>

              {/* Logo vs Logo + Skor Jumbo */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* Tim A */}
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

                {/* Skor Box */}
                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 font-mono shrink-0">
                  <span
                    className={`text-base font-black ${
                      aWin
                        ? "text-emerald-400 font-extrabold"
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
                        ? "text-emerald-400 font-extrabold"
                        : aWin
                        ? "text-rose-400"
                        : "text-white"
                    }`}
                  >
                    {live.scoreB}
                  </span>
                </div>

                {/* Tim B */}
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
