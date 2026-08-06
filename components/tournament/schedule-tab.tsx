"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";

export function ScheduleTab({
  schedules,
  allTeamNames,
  allWeeks,
  isAdmin,
  onResetSchedules,
  onSelectMatch,
  selectedGroupFilter,
  setSelectedGroupFilter,
  selectedDateFilter,
  setSelectedDateFilter,
}: {
  schedules: (MatchScheduleItem & { weekNumber: number })[];
  allTeamNames: string[];
  allWeeks: number[];
  isAdmin: boolean;
  onResetSchedules: () => void;
  onSelectMatch: (m: MatchScheduleItem) => void;
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  setSelectedGroupFilter: (v: "ALL" | "Group A" | "Group B") => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (v: string) => void;
}) {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>("ALL");
  const [hasFullAccess, setHasFullAccess] = useState<boolean>(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  // 🟢 1. DETEKSI PARAMETER URL ?admin=tsaqif
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const adminParam = searchParams.get("admin");
      if (adminParam === "tsaqif" || isAdmin) {
        setHasFullAccess(true);
      }
    }
  }, [isAdmin]);

  const sortedTeams = [...allTeamNames].sort((a, b) => a.localeCompare(b));
  const sortedWeeks = [...allWeeks].sort((a, b) => a - b);

  const now = new Date();

  // 🟢 2. HELPER MEMERIKSA SIKLUS MINGGU (SENIN 00:00 WIB ADALAH AWAL BUKA WEEK)
  const isWeekActiveByDate = (weekNum: number) => {
    const weekMatches = schedules.filter((m) => m.weekNumber === weekNum);
    if (weekMatches.length === 0) return true;

    const earliestMatchDate = new Date(
      Math.min(...weekMatches.map((m) => new Date(m.matchDate).getTime()))
    );

    const dayOfWeek = earliestMatchDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

    const weekStartMonday = new Date(earliestMatchDate);
    weekStartMonday.setDate(earliestMatchDate.getDate() + diffToMonday);
    weekStartMonday.setHours(0, 0, 0, 0);

    return now.getTime() >= weekStartMonday.getTime();
  };

  const visibleWeeksInDropdown = hasFullAccess
    ? sortedWeeks
    : sortedWeeks.filter((w) => isWeekActiveByDate(w));

  const isFilterActive =
    selectedGroupFilter !== "ALL" ||
    selectedTeamFilter !== "ALL" ||
    selectedWeekFilter !== "ALL" ||
    selectedDateFilter !== "";

  const handleResetFilters = () => {
    setSelectedGroupFilter("ALL");
    setSelectedTeamFilter("ALL");
    setSelectedWeekFilter("ALL");
    setSelectedDateFilter("");
  };

  // 🟢 3. STRICT FILTERING & SORTING OTOMATIS BERDASARKAN TANGGAL & JAM
  const filteredSchedules = useMemo(() => {
    const filtered = schedules.filter((m) => {
      const matchGroup = selectedGroupFilter === "ALL" || m.groupName === selectedGroupFilter;
      const matchTeam =
        selectedTeamFilter === "ALL" ||
        m.teamAName === selectedTeamFilter ||
        m.teamBName === selectedTeamFilter;
      const matchWeek =
        selectedWeekFilter === "ALL" || String(m.weekNumber) === selectedWeekFilter;

      const isWeekAllowed = hasFullAccess || isWeekActiveByDate(m.weekNumber);

      if (!selectedDateFilter) return matchGroup && matchTeam && matchWeek && isWeekAllowed;

      const mDate = new Date(m.matchDate).toLocaleDateString("sv-SE", {
        timeZone: "Asia/Jakarta",
      });
      return matchGroup && matchTeam && matchWeek && isWeekAllowed && mDate === selectedDateFilter;
    });

    // 🚀 URUTKAN BERDASARKAN WAKTU PERTANDINGAN (ASCENDING: TERAWAL S/D TERAKHIR)
    return filtered.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }, [
    schedules,
    selectedGroupFilter,
    selectedTeamFilter,
    selectedWeekFilter,
    selectedDateFilter,
    hasFullAccess,
  ]);

  const groupedSchedulesByWeek = filteredSchedules.reduce((acc, match) => {
    const weekKey = `Week ${match.weekNumber}`;
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(match);
    return acc;
  }, {} as Record<string, typeof filteredSchedules>);

  const displayDateText = selectedDateFilter
    ? new Date(selectedDateFilter).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Tanggal";

  const handleOpenDatePicker = () => {
    const input = dateInputRef.current;
    if (input) {
      if ("showPicker" in input && typeof (input as any).showPicker === "function") {
        (input as any).showPicker();
      } else {
        input.click();
      }
    }
  };

  // 🟢 HELPER RENDER FORMAT TANGGAL & JAM DINAMIS (WIB)
  const formatMatchDateTime = (isoString: string) => {
    if (!isoString) return "TBA";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "TBA";

    const dateStr = d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    });

    const timeStr = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).replace(".", ":");

    return `${dateStr} • ${timeStr} WIB`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Control Panel Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        
        {/* Filter Grup */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {[
            { key: "Group A", label: "Group A" },
            { key: "Group B", label: "Group B" },
            { key: "ALL", label: "All Group" },
          ].map((g) => (
            <button
              key={g.key}
              onClick={() => setSelectedGroupFilter(g.key as any)}
              className={`rounded-xl py-2 px-3 text-[10px] font-extrabold uppercase transition cursor-pointer ${
                selectedGroupFilter === g.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Dropdown Tim & Week */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">Semua Tim</option>
            {sortedTeams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedWeekFilter}
            onChange={(e) => setSelectedWeekFilter(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">Semua Week Aktif</option>
            {visibleWeeksInDropdown.map((w) => (
              <option key={w} value={String(w)}>
                Week {w}
              </option>
            ))}
          </select>
        </div>

        {/* Baris Input Tanggal & Reset Filter */}
        <div className="flex items-center gap-2 w-full">
          <div
            onClick={handleOpenDatePicker}
            className={`relative flex-1 flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
              selectedDateFilter
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border bg-background text-foreground hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <span>📅</span>
              <span>{displayDateText}</span>
            </div>
            <span className="text-[10px] text-muted-foreground pointer-events-none">▼</span>

            <input
              ref={dateInputRef}
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
          </div>

          <button
            disabled={!isFilterActive}
            onClick={handleResetFilters}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
              isFilterActive
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer shadow-sm"
                : "bg-muted/40 text-muted-foreground/40 border border-border/40 cursor-not-allowed opacity-50"
            }`}
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* Tombol khusus Admin */}
      {hasFullAccess && (
        <button
          onClick={onResetSchedules}
          className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 py-2.5 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Sync Tim Terbaru Dari Roulette & Generate Jadwal</span>
        </button>
      )}

      {/* Match List Grouped by Week */}
      {Object.keys(groupedSchedulesByWeek).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs font-bold text-muted-foreground">
          ⚠️ Tidak ada jadwal pertandingan aktif pada filter ini.
        </div>
      ) : (
        Object.entries(groupedSchedulesByWeek).map(([weekTitle, matchGroup]) => (
          <div key={weekTitle} className="flex flex-col gap-3">
            <div className="flex items-center justify-center border-b border-primary/30 pb-1 mt-1">
              <span className="text-xs font-black uppercase text-primary tracking-wider text-center">
                {weekTitle}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchGroup.map((match) => {
                const isGroupA = match.groupName === "Group A";
                return (
                  <div
                    key={match.id}
                    onClick={() => onSelectMatch(match)}
                    className={`flex flex-col justify-between rounded-2xl border p-4 shadow-md transition cursor-pointer hover:scale-[1.01] ${
                      isGroupA
                        ? "border-sky-500/40 bg-sky-950/10 hover:border-sky-400"
                        : "border-amber-500/40 bg-amber-950/10 hover:border-amber-400"
                    }`}
                  >
                    {/* 🟢 TANGGAL & JAM DINAMIS */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 text-[10px]">
                      <span
                        className={`font-black uppercase tracking-wider ${
                          isGroupA ? "text-sky-400" : "text-amber-400"
                        }`}
                      >
                        {match.groupName}
                      </span>
                      <span className="font-semibold text-primary">
                        {formatMatchDateTime(match.matchDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between my-2 gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img
                          src={match.teamALogo}
                          alt=""
                          className="h-7 w-7 object-contain shrink-0"
                        />
                        <span className="text-xs font-bold truncate">
                          {match.teamAName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-background/80 border border-border font-black text-sm shrink-0">
                        <span>{match.scoreA}</span>
                        <span>-</span>
                        <span>{match.scoreB}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-right truncate">
                          {match.teamBName}
                        </span>
                        <img
                          src={match.teamBLogo}
                          alt=""
                          className="h-7 w-7 object-contain shrink-0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
      }
