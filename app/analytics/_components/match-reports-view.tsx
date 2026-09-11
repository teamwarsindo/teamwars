"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DIVISION_MAP } from "@/app/tournament/_library";
import { ReportFilter, ReportFilterMatchItem } from "./report-filter";

export interface ScheduleItem extends ReportFilterMatchItem {
  matchDate?: string;
  isFinished?: boolean;
}

export function MatchReportsView({ schedules = [] }: { schedules: ScheduleItem[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  // 1. Ekstraksi daftar minggu yang tersedia (unik & terurut naik)
  const availableWeeks = useMemo(() => {
    if (!schedules || schedules.length === 0) return [1];
    const setW = new Set(schedules.map((s) => Number(s.weekNumber || 1)));
    const sorted = Array.from(setW).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [1];
  }, [schedules]);

  const defaultWeek = availableWeeks[availableWeeks.length - 1] || 1;

  // 2. State Filter
  const [selectedGroup, setSelectedGroup] = useState<"ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B>("ALL");
  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchParam);

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Inisialisasi awal saat schedules pertama kali masuk dari server
  useEffect(() => {
    if (schedules.length > 0 && !selectedMatchId) {
      const matchInParam = schedules.find((s) => s.id === matchParam);
      if (matchInParam) {
        setSelectedWeek(Number(matchInParam.weekNumber || 1));
        setSelectedMatchId(matchInParam.id);
      } else {
        const latestMatch = schedules[schedules.length - 1];
        setSelectedWeek(Number(latestMatch.weekNumber || 1));
        setSelectedMatchId(latestMatch.id);
      }
    }
  }, [schedules, matchParam, selectedMatchId]);

  // 3. Saring match sesuai Divisi & Week yang dipilih
  const matchesInView = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    return schedules.filter((s) => {
      const isWeekMatch = Number(s.weekNumber || 1) === Number(selectedWeek);

      let isGroupMatch = true;
      if (selectedGroup !== "ALL") {
        const rawGroup = (s.groupName || "").toLowerCase();
        const targetGroup = selectedGroup.toLowerCase();

        const isGroupA = targetGroup.includes("yakin") || targetGroup.includes("group a");
        const isGroupB = targetGroup.includes("sakurasawa") || targetGroup.includes("group b");

        if (isGroupA) {
          isGroupMatch = rawGroup.includes("yakin") || rawGroup.includes("group a") || rawGroup === "a";
        } else if (isGroupB) {
          isGroupMatch = rawGroup.includes("sakurasawa") || rawGroup.includes("group b") || rawGroup === "b";
        } else {
          isGroupMatch = s.groupName === selectedGroup;
        }
      }

      return isWeekMatch && isGroupMatch;
    });
  }, [schedules, selectedWeek, selectedGroup]);

  // Handler pergantian match
  const handleMatchChange = useCallback((newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", newMatchId);
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Auto-select match pertama di daftar jika filter divisi/week berubah
  useEffect(() => {
    if (matchesInView.length > 0) {
      const matchStillExists = matchesInView.some((m) => m.id === selectedMatchId);
      if (!matchStillExists) {
        handleMatchChange(matchesInView[0].id);
      }
    }
  }, [matchesInView, selectedMatchId, handleMatchChange]);

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedWeek(defaultWeek);
  };

  const isFilterActive = selectedGroup !== "ALL" || selectedWeek !== defaultWeek;

  // 4. Fetch data dari KV hash twi:match_reports via API
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

    // Auto-polling jika match masih berjalan
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
      {/* 1. FILTER TEMA RESMI TWI */}
      <ReportFilter
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        availableWeeks={availableWeeks}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {/* 2. KONTEN REPORT */}
      {loading && !report ? (
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
              <span className="font-bold text-foreground">{meta.streamPlatform || "YouTube / Discord"}</span>
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

          {/* SCOREBOARD HERO */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 sm:p-4 bg-muted/20 border-b border-border">
              <div className="truncate">
                <div className="font-black text-xs sm:text-base text-foreground truncate">{teamA.name || "Tim A"}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Kubu Kiri</div>
              </div>

              <div className="text-center px-2 shrink-0">
                <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none flex items-center justify-center gap-1.5">
                  <span className={scoreA > scoreB ? "text-primary" : "text-muted-foreground"}>{scoreA}</span>
                  <span className="text-muted-foreground/30 text-lg">-</span>
                  <span className={scoreB > scoreA ? "text-primary" : "text-muted-foreground"}>{scoreB}</span>
                </div>
                <span className={`inline-block px-2 py-0.2 rounded text-[8px] font-black uppercase tracking-wider mt-1 border ${
                  isFinished 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                }`}>
                  {isFinished ? "FINISHED" : "IN PROGRESS"}
                </span>
              </div>

              <div className="truncate text-right">
                <div className="font-black text-xs sm:text-base text-foreground truncate">{teamB.name || "Tim B"}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Kubu Kanan</div>
              </div>
            </div>

            {/* ROSTER RINGKAS */}
            <div className="grid grid-cols-2 divide-x divide-border bg-muted/5 text-[10px] p-2 border-b border-border">
              <div className="px-2 truncate">
                <span className="font-black text-[9px] text-muted-foreground uppercase block mb-0.5">Roster {teamA.name}:</span>
                <div className="text-foreground/80 font-medium truncate">
                  {(teamA.lineup || []).map((p: any) => p.ign).join(" • ") || "-"}
                </div>
              </div>
              <div className="px-2 text-right truncate">
                <span className="font-black text-[9px] text-muted-foreground uppercase block mb-0.5">Roster {teamB.name}:</span>
                <div className="text-foreground/80 font-medium truncate">
                  {(teamB.lineup || []).map((p: any) => p.ign).join(" • ") || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* TABEL DUEL GAME */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Rincian Game Duel ({games.length} Ronde)
              </span>
              <span className="text-[9px] font-bold text-muted-foreground">Format 10 Win</span>
            </div>

            {games.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">
                Pertandingan belum dimulai atau belum ada ronde duel yang diinput.
              </div>
            ) : (
              <div className="divide-y divide-border text-[11px]">
                {games.map((g: any, idx: number) => {
                  const isAWin = g.winner === "teamA";
                  const pA = g.playerA || {};
                  const pB = g.playerB || {};

                  return (
                    <div key={idx} className="p-2.5 hover:bg-muted/30 transition flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          G{g.gameNumber || idx + 1}
                        </span>

                        <div className="flex items-center gap-1 font-black">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            isAWin ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-muted text-muted-foreground"
                          }`}>
                            {isAWin ? "W" : "L"}
                          </span>
                          <span className="text-muted-foreground/40 text-[9px]">-</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            !isAWin ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-muted text-muted-foreground"
                          }`}>
                            {!isAWin ? "W" : "L"}
                          </span>
                        </div>

                        <div>
                          {g.isDeckloss ? (
                            <span className="text-[8px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/30 px-1.5 py-0.5 rounded">
                              DECKLOSS
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-muted-foreground/60">
                              Winner: {isAWin ? teamA.name : teamB.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
                        <div className={`space-y-0.5 truncate ${isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate text-xs font-black">{pA.ign || "-"}</span>
                            {pA.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1 rounded shrink-0">
                                R
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-foreground/90 font-medium truncate">{pA.archetype || "-"}</div>
                          {pA.skill && pA.skill !== "-" && (
                            <div className="text-[9px] text-muted-foreground truncate font-normal">🎯 {pA.skill}</div>
                          )}
                        </div>

                        <div className="text-[9px] font-bold text-muted-foreground/40 px-1 select-none">VS</div>

                        <div className={`space-y-0.5 truncate text-right ${!isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="flex items-center justify-end gap-1.5 truncate">
                            {pB.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1 rounded shrink-0">
                                R
                              </span>
                            )}
                            <span className="truncate text-xs font-black">{pB.ign || "-"}</span>
                          </div>
                          <div className="text-[10px] text-foreground/90 font-medium truncate">{pB.archetype || "-"}</div>
                          {pB.skill && pB.skill !== "-" && (
                            <div className="text-[9px] text-muted-foreground truncate font-normal">{pB.skill} 🎯</div>
                          )}
                        </div>
                      </div>

                      {g.notes && (
                        <div className="text-[9px] text-amber-500/90 italic bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 mt-0.5">
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
