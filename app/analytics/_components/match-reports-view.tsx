"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function MatchReportsView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchParam || "match-33");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Ganti match & sinkronkan ke query URL
  const handleSelectMatch = (newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", newMatchId);
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  // Fetch data report & polling jika IN PROGRESS
  useEffect(() => {
    if (!selectedMatchId) return;

    let isSubscribed = true;

    const fetchReport = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await fetch(`/api/tournament/match-report?matchId=${selectedMatchId}`);
        const json = await res.json();
        if (json.success && json.data && isSubscribed) {
          setReport(json.data);
        }
      } catch (err) {
        console.error("Gagal load match report:", err);
      } finally {
        if (!isSilent && isSubscribed) setLoading(false);
      }
    };

    fetchReport();

    // Auto polling setiap 5 detik jika pertandingan belum selesai
    const interval = setInterval(() => {
      if (report && !report.isFinished) {
        fetchReport(true);
      }
    }, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedMatchId, report?.isFinished]);

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];

  const scoreA = teamA.score ?? 0;
  const scoreB = teamB.score ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);

  return (
    <div className="w-full space-y-4">
      {/* 1. FILTER BAR (PEKAN & MATCH SELECTOR) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Pilih Match:
          </span>
          <select
            value={selectedMatchId}
            onChange={(e) => handleSelectMatch(e.target.value)}
            className="h-8 rounded-lg bg-muted/60 px-2.5 text-xs font-semibold text-foreground border border-border focus:outline-none w-full sm:w-64 cursor-pointer"
          >
            <option value="match-33">Week 5: Final Chapter vs TRUE GOD</option>
            <option value="match-48">Week 6: FPF Fabulous vs DS Octagram</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground self-end sm:self-auto">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Sync Active</span>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          Memuat data laporan pertandingan...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs italic text-muted-foreground bg-card rounded-2xl border border-border">
          Data laporan untuk pertandingan ini belum tersedia.
        </div>
      ) : (
        <div className="space-y-4">
          {/* 2. WASIT & STREAMER */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-card border border-border text-[11px]">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Referee / Wasit</span>
              <span className="font-semibold truncate block text-foreground">{meta.referee || "-"}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Streamer / Live</span>
              {meta.streamUrl ? (
                <a
                  href={meta.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline truncate block"
                >
                  {meta.streamer || "Tonton Tayangan"} ↗
                </a>
              ) : (
                <span className="font-semibold truncate block text-foreground">{meta.streamer || "-"}</span>
              )}
            </div>
          </div>

          {/* 3. SCOREBOARD HERO */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 rounded-xl bg-card border border-border shadow-sm">
            {/* TIM A */}
            <div className="truncate">
              <span className="font-extrabold text-xs sm:text-base text-foreground block truncate">
                {teamA.name || "Team A"}
              </span>
              <span className="text-[9px] text-muted-foreground block">
                {teamA.lineup?.length || 0} Players
              </span>
            </div>

            {/* SKOR BESAR */}
            <div className="text-center px-3 shrink-0">
              <div className="text-2xl sm:text-4xl font-black tracking-tight leading-none">
                <span className={scoreA > scoreB ? "text-primary font-black" : "text-muted-foreground"}>{scoreA}</span>
                <span className="text-muted-foreground/40 mx-2 text-xl">-</span>
                <span className={scoreB > scoreA ? "text-primary font-black" : "text-muted-foreground"}>{scoreB}</span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-1.5 border ${
                isFinished 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}>
                {isFinished ? "FINISHED" : "IN PROGRESS"}
              </span>
            </div>

            {/* TIM B */}
            <div className="text-right truncate">
              <span className="font-extrabold text-xs sm:text-base text-foreground block truncate">
                {teamB.name || "Team B"}
              </span>
              <span className="text-[9px] text-muted-foreground block">
                {teamB.lineup?.length || 0} Players
              </span>
            </div>
          </div>

          {/* 4. LINEUP RINGKAS */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Lineup Pemain
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                <div className="font-bold text-primary truncate text-[11px] pb-1 border-b border-border/50">
                  {teamA.name}
                </div>
                <div className="space-y-0.5">
                  {(teamA.lineup || []).map((p: any, i: number) => (
                    <div key={i} className="truncate text-foreground/90 flex items-center gap-1.5">
                      <span className="text-muted-foreground/60 text-[10px] w-3">{i + 1}.</span>
                      <span className="font-medium truncate">{p.ign}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                <div className="font-bold text-rose-500 truncate text-[11px] pb-1 border-b border-border/50">
                  {teamB.name}
                </div>
                <div className="space-y-0.5">
                  {(teamB.lineup || []).map((p: any, i: number) => (
                    <div key={i} className="truncate text-foreground/90 flex items-center gap-1.5">
                      <span className="text-muted-foreground/60 text-[10px] w-3">{i + 1}.</span>
                      <span className="font-medium truncate">{p.ign}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. LOG DUEL GAME-BY-GAME */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Rincian Duel ({games.length} Game)
            </span>

            {games.length === 0 ? (
              <div className="p-6 text-center text-xs italic text-muted-foreground bg-card border border-border rounded-xl">
                Pertandingan belum dimulai atau belum ada game yang diinput.
              </div>
            ) : (
              <div className="space-y-1.5">
                {games.map((g: any, idx: number) => {
                  const isAWin = g.winner === "teamA";
                  const pA = g.playerA || {};
                  const pB = g.playerB || {};

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-card hover:bg-muted/30 border border-border transition flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold font-mono text-muted-foreground">
                          #{g.gameNumber || idx + 1}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {g.isDeckloss && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              DECKLOSS
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                              isAWin
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            }`}
                          >
                            WIN: {isAWin ? teamA.name : teamB.name}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-[11px] pt-1 border-t border-border/40">
                        {/* PEMAIN A */}
                        <div className={`truncate ${isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="truncate flex items-center gap-1">
                            <span className="truncate">{pA.ign || "-"}</span>
                            {pA.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1 rounded border border-amber-500/30">R</span>
                            )}
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 truncate">
                            {pA.archetype || "-"}
                          </div>
                        </div>

                        <div className="text-[8px] font-bold text-muted-foreground px-1">
                          vs
                        </div>

                        {/* PEMAIN B */}
                        <div className={`text-right truncate ${!isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="truncate flex items-center justify-end gap-1">
                            {pB.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1 rounded border border-amber-500/30">R</span>
                            )}
                            <span className="truncate">{pB.ign || "-"}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 truncate">
                            {pB.archetype || "-"}
                          </div>
                        </div>
                      </div>

                      {g.notes && (
                        <div className="text-[9px] text-amber-500/90 italic bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 mt-0.5">
                          {g.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
                                            }
                      
