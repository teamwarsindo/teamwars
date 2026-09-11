"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReportFilter, ReportFilterMatchItem } from "./report-filter";

export interface ScheduleItem extends ReportFilterMatchItem {
  matchDate?: string;
  isFinished?: boolean;
}

export function MatchReportsView({ schedules = [] }: { schedules: ScheduleItem[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  // 1. Ambil list week unik (hanya week yang benar-benar ada di master data)
  const availableWeeks = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    const setW = new Set(schedules.map((s) => Number(s.weekNumber || 1)));
    return Array.from(setW).sort((a, b) => a - b);
  }, [schedules]);

  // Awal dibiarkan kosong, kecuali jika ada URL param ?match=
  const initialMatch = useMemo(() => {
    if (matchParam && schedules.length > 0) {
      return schedules.find((s) => s.id === matchParam) || null;
    }
    return null;
  }, [schedules, matchParam]);

  const [selectedWeek, setSelectedWeek] = useState<number | "">(initialMatch ? initialMatch.weekNumber : "");
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatch ? initialMatch.id : "");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // List match di Week terpilih
  const matchesInView = useMemo(() => {
    if (!selectedWeek || schedules.length === 0) return [];
    return schedules.filter((s) => Number(s.weekNumber || 1) === Number(selectedWeek));
  }, [schedules, selectedWeek]);

  // Handler Week
  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setSelectedMatchId(""); // Kosongkan pilihan match saat week berganti
    setReport(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  // Handler Match
  const handleMatchChange = useCallback((newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", newMatchId);
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleReset = () => {
    setSelectedWeek("");
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const isFilterActive = selectedWeek !== "" || selectedMatchId !== "";

  // 2. Fetch Laporan Pertandingan
  useEffect(() => {
    if (!selectedMatchId) {
      setReport(null);
      return;
    }

    let isSubscribed = true;

    const fetchReport = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await fetch(`/api/tournament/match-report?matchId=${selectedMatchId}`);
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
      {/* 1. FILTER REKAYASA BARU */}
      <ReportFilter
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        availableWeeks={availableWeeks}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {/* 2. AREA TAMPILAN REPORT */}
      {!selectedMatchId ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
          Silakan pilih <strong>Week</strong> dan <strong>Match</strong> di atas untuk melihat rincian duel.
        </div>
      ) : loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          ⏳ Memuat data laporan resmi pertandingan...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs italic text-muted-foreground bg-card rounded-2xl border border-border">
          Data laporan untuk pertandingan ini belum tersedia di sistem.
        </div>
      ) : (
        <div className="space-y-3">
          {/* METADATA STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-card border border-border text-[11px]">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Platform</span>
              <span className="font-bold text-foreground truncate block">{meta.streamPlatform || "YouTube / Discord"}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Streamer</span>
              {meta.streamUrl ? (
                <a href={meta.streamUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline truncate block">
                  {meta.streamer || "Tonton Siaran"} ↗
                </a>
              ) : (
                <span className="font-semibold text-foreground truncate block">{meta.streamer || "-"}</span>
              )}
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Judge / Wasit</span>
              <span className="font-semibold text-foreground truncate block">{meta.referee || "-"}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Tanggal</span>
              <span className="font-semibold text-foreground truncate block">{meta.matchDate || "-"}</span>
            </div>
          </div>

          {/* SCOREBOARD HERO DENGAN ROSTER MOBILE-FRIENDLY */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 bg-muted/20 border-b border-border">
              <div className="truncate">
                <div className="font-black text-sm sm:text-base text-foreground truncate">{teamA.name || "Tim A"}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Kubu Kiri</div>
              </div>

              <div className="text-center px-2 shrink-0">
                <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none flex items-center justify-center gap-1.5">
                  <span className={scoreA > scoreB ? "text-primary" : "text-muted-foreground"}>{scoreA}</span>
                  <span className="text-muted-foreground/30 text-xl">-</span>
                  <span className={scoreB > scoreA ? "text-primary" : "text-muted-foreground"}>{scoreB}</span>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-1.5 border ${
                  isFinished 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                }`}>
                  {isFinished ? "FINISHED" : "IN PROGRESS"}
                </span>
              </div>

              <div className="truncate text-right">
                <div className="font-black text-sm sm:text-base text-foreground truncate">{teamB.name || "Tim B"}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Kubu Kanan</div>
              </div>
            </div>

            {/* ROSTER WRAP CHIPS (TIDAK AKAN TERPOTONG ELIPSIS DI HP) */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border bg-muted/5 p-3 text-[11px] gap-2.5">
              <div className="space-y-1">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Roster {teamA.name}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(teamA.lineup || []).length > 0 ? (
                    teamA.lineup.map((p: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-foreground font-medium text-[10px]">
                        {p.ign}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[10px] italic">Belum ada roster</span>
                  )}
                </div>
              </div>

              <div className="space-y-1 pt-2 md:pt-0">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider block md:text-right">
                  Roster {teamB.name}:
                </span>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {(teamB.lineup || []).length > 0 ? (
                    teamB.lineup.map((p: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-foreground font-medium text-[10px]">
                        {p.ign}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[10px] italic">Belum ada roster</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TABEL DUEL RINCIAN GAME (PRESISI & TEMA GELAP BERSIH) */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-foreground tracking-wider">
                Rincian Game Duel ({games.length} Ronde)
              </span>
              <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Format 10 Win
              </span>
            </div>

            {games.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">
                Pertandingan belum dimulai atau belum ada ronde duel yang diinput.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {games.map((g: any, idx: number) => {
                  const isAWin = g.winner === "teamA";
                  const pA = g.playerA || {};
                  const pB = g.playerB || {};

                  return (
                    <div key={idx} className="p-3 hover:bg-muted/20 transition flex flex-col gap-2">
                      {/* HEADER GAME: G#, BADGE HASIL, PEMENANG */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-black text-muted-foreground bg-muted/80 px-2 py-0.5 rounded text-[10px]">
                          G{g.gameNumber || idx + 1}
                        </span>

                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={`w-6 text-center py-0.5 rounded text-[10px] font-black ${
                              isAWin
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {isAWin ? "W" : "L"}
                          </span>
                          <span className="text-muted-foreground/30 text-xs">-</span>
                          <span
                            className={`w-6 text-center py-0.5 rounded text-[10px] font-black ${
                              !isAWin
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {!isAWin ? "W" : "L"}
                          </span>
                        </div>

                        <div className="text-[10px] font-semibold text-muted-foreground">
                          {g.isDeckloss ? (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-black text-[9px]">
                              DECKLOSS
                            </span>
                          ) : (
                            <span>Win: {isAWin ? teamA.name : teamB.name}</span>
                          )}
                        </div>
                      </div>

                      {/* RINCIAN PEMAIN, ARCHETYPE & SKILL (GRID 2 SISI PRESISI) */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pt-1 border-t border-border/30">
                        {/* KUBU A */}
                        <div className={`space-y-0.5 min-w-0 ${isAWin ? "text-foreground" : "text-muted-foreground/70"}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs truncate">{pA.ign || "-"}</span>
                            {pA.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded">
                                R
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-foreground/90 truncate">{pA.archetype || "-"}</div>
                          {pA.skill && pA.skill !== "-" && (
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              <span>🎯</span>
                              <span className="truncate">{pA.skill}</span>
                            </div>
                          )}
                        </div>

                        {/* VS DIVIDER */}
                        <div className="text-[9px] font-bold text-muted-foreground/30 select-none px-1">
                          VS
                        </div>

                        {/* KUBU B */}
                        <div className={`space-y-0.5 min-w-0 text-right ${!isAWin ? "text-foreground" : "text-muted-foreground/70"}`}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {pB.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded">
                                R
                              </span>
                            )}
                            <span className="font-bold text-xs truncate">{pB.ign || "-"}</span>
                          </div>
                          <div className="text-[11px] font-medium text-foreground/90 truncate">{pB.archetype || "-"}</div>
                          {pB.skill && pB.skill !== "-" && (
                            <div className="text-[10px] text-muted-foreground truncate flex items-center justify-end gap-1">
                              <span className="truncate">{pB.skill}</span>
                              <span>🎯</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CATATAN TAMBAHAN (JIKA ADA) */}
                      {g.notes && (
                        <div className="text-[10px] text-amber-400/90 italic bg-amber-500/5 px-2.5 py-1 rounded border border-amber-500/15 mt-1">
                          Note: {g.notes}
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
