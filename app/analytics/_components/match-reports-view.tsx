"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

interface ScheduleOption {
  id: string;
  weekNumber: number;
  teamAName: string;
  teamBName: string;
  date?: string;
}

export function MatchReportsView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchParam);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Fetch daftar seluruh schedule untuk membangun dropdown dinamis Week 1 s/d selesai
  useEffect(() => {
    async function loadSchedules() {
      try {
        const res = await fetch("/api/tournament/schedules");
        const json = await res.json();
        const list: ScheduleOption[] = json.data || json.schedules || [];
        setSchedules(list);

        if (list.length > 0) {
          // Cari match default: dari URL param, atau match terakhir yang berjalan
          const matched = list.find((m) => m.id === matchParam);
          if (matched) {
            setSelectedWeek(matched.weekNumber || 1);
            setSelectedMatchId(matched.id);
          } else {
            const latest = list[list.length - 1];
            setSelectedWeek(latest.weekNumber || 1);
            setSelectedMatchId(latest.id);
          }
        }
      } catch (err) {
        console.error("Gagal load schedules:", err);
      }
    }
    loadSchedules();
  }, [matchParam]);

  // List minggu yang tersedia (unik & terurut)
  const availableWeeks = useMemo(() => {
    const weeks = Array.from(new Set(schedules.map((s) => s.weekNumber || 1)));
    return weeks.sort((a, b) => a - b);
  }, [schedules]);

  // List match di minggu yang sedang dipilih
  const matchesInSelectedWeek = useMemo(() => {
    return schedules.filter((s) => (s.weekNumber || 1) === selectedWeek);
  }, [schedules, selectedWeek]);

  // Handler pergantian Week
  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    const firstMatch = schedules.find((s) => (s.weekNumber || 1) === week);
    if (firstMatch) {
      handleSelectMatch(firstMatch.id);
    }
  };

  // Handler pergantian Match
  const handleSelectMatch = (newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", newMatchId);
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  // 2. Fetch Data Report & Polling Real-Time
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
    <div className="w-full space-y-4 max-w-4xl mx-auto">
      {/* 1. FILTER BAR BERTINGKAT (CUSTOM THEMED DROPDOWN) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card/70 border border-border backdrop-blur-md shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* FILTER WEEK BUTTONS / DROPDOWN */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider pl-1">
              Week:
            </span>
            <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/50">
              {availableWeeks.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleWeekChange(w)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    selectedWeek === w
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  W{w}
                </button>
              ))}
            </div>
          </div>

          {/* FILTER MATCH DROPDOWN DENGAN STYLE SINKRON TEMA */}
          <div className="relative flex-1 sm:w-64">
            <select
              value={selectedMatchId}
              onChange={(e) => handleSelectMatch(e.target.value)}
              className="w-full h-8.5 rounded-xl bg-muted/50 hover:bg-muted/80 px-3 pr-8 text-xs font-bold text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition"
            >
              {matchesInSelectedWeek.map((m) => (
                <option key={m.id} value={m.id} className="bg-popover text-popover-foreground">
                  {m.teamAName} vs {m.teamBName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              ▼
            </div>
          </div>
        </div>

        {/* LIVE SYNC STATUS */}
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground font-semibold px-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isFinished ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
          <span>{isFinished ? "Final Verified" : "Live Sync Active"}</span>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          ⏳ Memuat data laporan resmi pertandingan...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs italic text-muted-foreground bg-card rounded-2xl border border-border">
          Data laporan untuk pertandingan ini belum tersedia.
        </div>
      ) : (
        <div className="space-y-3">
          {/* 2. MATCH METADATA STRIP (STREAM, JUDGE, TANGGAL) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-card border border-border text-[11px]">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Platform</span>
              <span className="font-bold text-foreground">{meta.streamPlatform || "YouTube / Discord"}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Streamer</span>
              {meta.streamUrl ? (
                <a href={meta.streamUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline truncate block">
                  {meta.streamer || "Tonton Tayangan"} ↗
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
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block">Tanggal Tanding</span>
              <span className="font-semibold text-foreground truncate block">{meta.matchDate || "Hari Ini"}</span>
            </div>
          </div>

          {/* 3. HERO SCOREBOARD DENGAN LOGO & COMPACT ROSTER */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 sm:p-4 bg-muted/20 border-b border-border">
              {/* TIM A HEADER */}
              <div className="flex items-center gap-2.5 truncate">
                <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/80 border border-border shrink-0 flex items-center justify-center overflow-hidden">
                  {teamA.logoUrl ? (
                    <Image src={teamA.logoUrl} alt={teamA.name} fill sizes="48px" className="object-contain p-1" />
                  ) : (
                    <span className="font-black text-xs text-primary">{teamA.name?.slice(0, 3).toUpperCase()}</span>
                  )}
                </div>
                <div className="truncate">
                  <div className="font-black text-xs sm:text-sm text-foreground truncate">{teamA.name}</div>
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">Kubu Kiri</div>
                </div>
              </div>

              {/* SKOR BESAR */}
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

              {/* TIM B HEADER */}
              <div className="flex items-center justify-end gap-2.5 truncate text-right">
                <div className="truncate">
                  <div className="font-black text-xs sm:text-sm text-foreground truncate">{teamB.name}</div>
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">Kubu Kanan</div>
                </div>
                <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/80 border border-border shrink-0 flex items-center justify-center overflow-hidden">
                  {teamB.logoUrl ? (
                    <Image src={teamB.logoUrl} alt={teamB.name} fill sizes="48px" className="object-contain p-1" />
                  ) : (
                    <span className="font-black text-xs text-rose-500">{teamB.name?.slice(0, 3).toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* COMPACT ROSTER HORISONTAL (SEPERTI LEMBAR RESMI TWI) */}
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

          {/* 4. TABEL DETAIL DUEL (SKILL, ARCHETYPE, RESULT & REPEAT SINKRON KE LEMBAR TWI) */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Rincian Game Duel ({games.length} Ronde)
              </span>
              <span className="text-[9px] font-bold text-muted-foreground">Format 10 Win</span>
            </div>

            {games.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground">
                Pertandingan belum dimulai atau belum ada ronde yang dicatat wasit.
              </div>
            ) : (
              <div className="divide-y divide-border text-[11px]">
                {games.map((g: any, idx: number) => {
                  const isAWin = g.winner === "teamA";
                  const pA = g.playerA || {};
                  const pB = g.playerB || {};

                  return (
                    <div
                      key={idx}
                      className="p-2.5 hover:bg-muted/30 transition flex flex-col gap-1.5"
                    >
                      {/* BARIS ATAS: NOMOR GAME, RESULT W-L, DAN CATATAN SANKSI */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          G{g.gameNumber || idx + 1}
                        </span>

                        {/* STATUS W - L TENGAH */}
                        <div className="flex items-center gap-1 font-black">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            isAWin 
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {isAWin ? "W" : g.isLossTeamA ? (g.lossReasonA || "L") : "L"}
                          </span>
                          <span className="text-muted-foreground/40 text-[9px]">-</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            !isAWin 
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {!isAWin ? "W" : g.isLossTeamB ? (g.lossReasonB || "L") : "L"}
                          </span>
                        </div>

                        {/* BADGE DECKLOSS / WARNING */}
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

                      {/* BARIS UTAMA: DETAIL DUEL LENGKAP (IGN, SKILL, ARCHETYPE, REPEAT) */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
                        {/* KUBU A */}
                        <div className={`space-y-0.5 truncate ${isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate text-xs font-black">{pA.ign || "-"}</span>
                            {pA.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1 rounded shrink-0">
                                R
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-foreground/90 font-medium truncate">
                            {pA.archetype || "-"}
                          </div>
                          {pA.skill && pA.skill !== "-" && (
                            <div className="text-[9px] text-muted-foreground truncate font-normal">
                              🎯 {pA.skill}
                            </div>
                          )}
                        </div>

                        <div className="text-[9px] font-bold text-muted-foreground/40 px-1 select-none">
                          VS
                        </div>

                        {/* KUBU B */}
                        <div className={`space-y-0.5 truncate text-right ${!isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="flex items-center justify-end gap-1.5 truncate">
                            {pB.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1 rounded shrink-0">
                                R
                              </span>
                            )}
                            <span className="truncate text-xs font-black">{pB.ign || "-"}</span>
                          </div>
                          <div className="text-[10px] text-foreground/90 font-medium truncate">
                            {pB.archetype || "-"}
                          </div>
                          {pB.skill && pB.skill !== "-" && (
                            <div className="text-[9px] text-muted-foreground truncate font-normal">
                              {pB.skill} 🎯
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CATATAN WASIT (JIKA ADA KELUHAN / PENALTI) */}
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
