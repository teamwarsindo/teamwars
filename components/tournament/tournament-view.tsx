"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export function TournamentView({
  isAdmin,
  selectedGroupFilter,
  setSelectedGroupFilter,
  selectedDateFilter,
  setSelectedDateFilter,
}: {
  isAdmin: boolean;
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  setSelectedGroupFilter: (v: "ALL" | "Group A" | "Group B") => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (v: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "GROUP_STANDING" | "GLOBAL_STANDING" | "PLAYOFF">("SCHEDULE");
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [standings, setStandings] = useState<TeamStandingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 State Filter Tambahan: Filter Tim & Filter Week
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>("ALL");

  // 🔹 State Modal Match Report
  const [activeReportMatch, setActiveReportMatch] = useState<MatchScheduleItem | null>(null);

  const fetchTournamentData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();
      if (data) {
        setSchedules(data.schedules || []);
        setStandings(data.standings || []);
      }
    } catch (err) {
      console.error("Error fetching tournament:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, []);

  const handleForceResetSchedules = async () => {
    const res = await Swal.fire({
      title: "REGENERATE JADWAL DEFAULT?",
      text: "Sistem akan membuat ulang jadwal Group A & B (Rabu-Sabtu jam 20:00 WIB, 1 Match/Minggu per tim).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Reset Jadwal",
      confirmButtonColor: "#0284c7",
    });

    if (!res.isConfirmed) return;

    setIsLoading(true);
    await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "FORCE_RESET_SCHEDULES" }),
    });

    setSelectedDateFilter("");
    setSelectedGroupFilter("ALL");
    setSelectedTeamFilter("ALL");
    setSelectedWeekFilter("ALL");
    await fetchTournamentData();
    setIsLoading(false);

    Swal.fire("Berhasil!", "Jadwal Round-Robin telah berhasil dibuat ulang.", "success");
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Data Turnamen...</div>;
  }

  // 🎯 Logika Penentuan Week (Rabu-Sabtu dianggap 1 Week)
  const getMatchWeekNumber = (dateString: string) => {
    const startDate = new Date("2026-08-05T00:00:00+07:00").getTime();
    const matchDate = new Date(dateString).getTime();
    const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };

  // Attach Week Number ke setiap match
  const schedulesWithWeek = schedules.map((m) => ({
    ...m,
    weekNumber: getMatchWeekNumber(m.matchDate),
  }));

  // Daftar Semua Tim dari Standings untuk Filter Tim
  const allTeamNames = Array.from(new Set(standings.map((s) => s.teamName)));
  
  // Daftar Semua Week yang ada
  const allWeeks = Array.from(new Set(schedulesWithWeek.map((m) => m.weekNumber))).sort((a, b) => a - b);

  // 🔍 Filtering Match
  const filteredSchedules = schedulesWithWeek.filter((m) => {
    const matchGroup = selectedGroupFilter === "ALL" || m.groupName === selectedGroupFilter;
    const matchTeam = selectedTeamFilter === "ALL" || m.teamAName === selectedTeamFilter || m.teamBName === selectedTeamFilter;
    const matchWeek = selectedWeekFilter === "ALL" || String(m.weekNumber) === selectedWeekFilter;

    if (!selectedDateFilter) return matchGroup && matchTeam && matchWeek;
    
    const mDate = new Date(m.matchDate).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    return matchGroup && matchTeam && matchWeek && mDate === selectedDateFilter;
  });

  // 🗂️ Pengelompokan Match Berdasarkan Week
  const groupedSchedulesByWeek = filteredSchedules.reduce((acc, match) => {
    const weekKey = `Week ${match.weekNumber}`;
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(match);
    return acc;
  }, {} as Record<string, typeof filteredSchedules>);

  const groupAStandings = standings.filter((s) => s.groupName === "Group A");
  const groupBStandings = standings.filter((s) => s.groupName === "Group B");

  return (
    <div className="w-full flex flex-col gap-5">
      
      {/* 🔲 KOTAK TAB NAVIGATION */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        {[
          { key: "SCHEDULE", label: "Schedule" },
          { key: "GROUP_STANDING", label: "Group Standing" },
          { key: "GLOBAL_STANDING", label: "Global Standing" },
          { key: "PLAYOFF", label: "Playoff Bracket" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-xl py-3 px-2 text-center text-xs font-extrabold uppercase border transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📅 SCHEDULE TAB */}
      {activeTab === "SCHEDULE" && (
        <div className="flex flex-col gap-4">
          
          {/* FILTER CONTROL PANEL */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
            {/* Filter Grup */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {(["ALL", "Group A", "Group B"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGroupFilter(g)}
                  className={`rounded-lg py-2 px-3 text-[10px] font-bold uppercase transition cursor-pointer ${
                    selectedGroupFilter === g ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g === "ALL" ? "Semua Grup" : g}
                </button>
              ))}
            </div>

            {/* Filter Dropdown: Tim, Week, & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Filter Tim */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground">🛡️ Filter Tim:</span>
                <select
                  value={selectedTeamFilter}
                  onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background p-1.5 text-xs text-foreground cursor-pointer"
                >
                  <option value="ALL">Semua Tim</option>
                  {allTeamNames.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Filter Week */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground">🏆 Filter Week:</span>
                <select
                  value={selectedWeekFilter}
                  onChange={(e) => setSelectedWeekFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background p-1.5 text-xs text-foreground cursor-pointer"
                >
                  <option value="ALL">Semua Week</option>
                  {allWeeks.map((w) => (
                    <option key={w} value={String(w)}>Week {w}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tanggal */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground">📅 Filter Tanggal:</span>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground cursor-pointer"
                  />
                  {(selectedDateFilter || selectedTeamFilter !== "ALL" || selectedWeekFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setSelectedDateFilter("");
                        setSelectedTeamFilter("ALL");
                        setSelectedWeekFilter("ALL");
                      }}
                      className="rounded-lg bg-rose-500/20 px-2 py-1.5 text-[10px] font-bold text-rose-400 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TOMBOL RESET ADMIN */}
          {isAdmin && (
            <button
              onClick={handleForceResetSchedules}
              className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 py-2.5 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition cursor-pointer"
            >
              🔄 Buat Ulang Jadwal Default (Rabu-Sabtu 20:00 WIB)
            </button>
          )}

          {/* LIST MATCH GROUPED BY WEEK */}
          {Object.keys(groupedSchedulesByWeek).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs font-bold text-muted-foreground">
              ⚠️ Tidak ada jadwal pertandingan pada filter ini.
            </div>
          ) : (
            Object.entries(groupedSchedulesByWeek).map(([weekTitle, matchGroup]) => (
              <div key={weekTitle} className="flex flex-col gap-3">
                {/* Header Week */}
                <div className="flex items-center gap-2 border-b border-primary/30 pb-1 mt-2">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">{weekTitle}</span>
                  <span className="text-[10px] text-muted-foreground">({matchGroup.length} Match)</span>
                </div>

                {/* Grid Match Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchGroup.map((match) => {
                    const dateObj = new Date(match.matchDate);
                    const dateFormatted = dateObj.toLocaleDateString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: "Asia/Jakarta",
                    });
                    const timeFormatted = dateObj.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "Asia/Jakarta",
                    }) + " WIB";

                    return (
                      <div
                        key={match.id}
                        onClick={() => setActiveReportMatch(match)} // 👈 KLIk UNTUK BUKA MODAL MATCH REPORT
                        className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/50 transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 text-[10px]">
                          <span className={`font-bold ${match.groupName === "Group A" ? "text-sky-400" : "text-amber-400"}`}>
                            {match.groupName}
                          </span>
                          <span className="font-semibold text-primary">{dateFormatted} - {timeFormatted}</span>
                        </div>

                        <div className="flex items-center justify-between my-2 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <img src={match.teamALogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                            <span className="text-xs font-bold truncate group-hover:text-primary transition">{match.teamAName}</span>
                          </div>

                          <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-background border border-border font-black text-sm shrink-0">
                            <span className={match.scoreA >= 10 ? "text-emerald-400" : ""}>{match.scoreA}</span>
                            <span className="text-muted-foreground text-xs">-</span>
                            <span className={match.scoreB >= 10 ? "text-emerald-400" : ""}>{match.scoreB}</span>
                          </div>

                          <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-right truncate group-hover:text-primary transition">{match.teamBName}</span>
                            <img src={match.teamBLogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                          <span>Judge: {match.referee || "TBA"}</span>
                          <span className="text-sky-400 font-semibold group-hover:underline">📋 Lihat Match Report →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 📊 GROUP STANDING */}
      {activeTab === "GROUP_STANDING" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StandingTable title="Group A Standing" data={groupAStandings} />
          <StandingTable title="Group B Standing" data={groupBStandings} />
        </div>
      )}

      {/* 🌍 GLOBAL STANDING */}
      {activeTab === "GLOBAL_STANDING" && (
        <StandingTable title="Global Wildcard Standings (16 Tim)" data={standings} isGlobal />
      )}

      {/* 🏆 PLAYOFF BRACKET */}
      {activeTab === "PLAYOFF" && (
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 overflow-x-auto">
          <h3 className="text-xs font-black uppercase text-primary border-b border-border pb-2">
            🏆 QUALIFIER & PLAYOFF BRACKET SCHEME
          </h3>
          
          <div className="min-w-[700px] grid grid-cols-4 gap-4 text-xs">
            <div className="flex flex-col justify-around gap-6">
              <span className="font-extrabold text-[10px] text-muted-foreground uppercase">Round One</span>
              <BracketCard p1="Top 1 Group A" p2="Wildcard Seed 8" />
              <BracketCard p1="Top 2 Group B" p2="Wildcard Seed 7" />
              <BracketCard p1="Top 1 Group B" p2="Wildcard Seed 6" />
              <BracketCard p1="Top 2 Group A" p2="Wildcard Seed 5" />
            </div>

            <div className="flex flex-col justify-around gap-12 my-auto">
              <span className="font-extrabold text-[10px] text-muted-foreground uppercase">Quarter-Final</span>
              <BracketCard p1="Winner R1 #1" p2="Winner R1 #2" />
              <BracketCard p1="Winner R1 #3" p2="Winner R1 #4" />
            </div>

            <div className="flex flex-col justify-around gap-20 my-auto">
              <span className="font-extrabold text-[10px] text-muted-foreground uppercase">Semi-Final</span>
              <BracketCard p1="Winner SF #1" p2="Winner SF #2" />
            </div>

            <div className="flex flex-col justify-center my-auto">
              <span className="font-extrabold text-[10px] text-amber-400 uppercase mb-2">Grand Final</span>
              <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-950/20 p-4 text-center">
                <p className="font-extrabold text-amber-400">GRAND FINAL</p>
                <p className="text-[10px] text-muted-foreground mt-1">Winner SF #1 VS Winner SF #2</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📋 POP-UP MODAL MATCH REPORT (DI-KLIK DARI CARDS JADWAL) */}
      {activeReportMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Close Button */}
            <button
              onClick={() => setActiveReportMatch(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>

            {/* Header Info Match Report */}
            <div className="flex flex-col gap-3 border-b border-border pb-4 mb-4 text-center">
              <span className="text-xs font-bold text-sky-400 uppercase">
                {activeReportMatch.groupName} • Week {getMatchWeekNumber(activeReportMatch.matchDate)}
              </span>
              
              <div className="flex items-center justify-around my-2">
                <div className="flex flex-col items-center gap-1 w-1/3">
                  <img src={activeReportMatch.teamALogo} alt="" className="h-12 w-12 object-contain" />
                  <span className="font-black text-xs sm:text-sm text-center">{activeReportMatch.teamAName}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="text-3xl font-black text-sky-400">
                    {activeReportMatch.scoreA} - {activeReportMatch.scoreB}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Race To 10 Wins</span>
                </div>

                <div className="flex flex-col items-center gap-1 w-1/3">
                  <img src={activeReportMatch.teamBLogo} alt="" className="h-12 w-12 object-contain" />
                  <span className="font-black text-xs sm:text-sm text-center">{activeReportMatch.teamBName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                <span>Judge: <strong className="text-foreground">{activeReportMatch.referee || "vG®D WHY"}</strong></span>
                <span>Streamer: <strong className="text-foreground">{activeReportMatch.streamer || "Alroy_Yuan"}</strong></span>
              </div>
            </div>

            {/* Log Per Pertandingan Game KOF */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black uppercase text-primary border-b border-border/40 pb-1">
                🎮 Game Detail Logs
              </h4>

              {!activeReportMatch.gameLogs || activeReportMatch.gameLogs.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  Pertandingan ini belum dimainkan atau laporan log belum di-input oleh Analyst.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bo    
