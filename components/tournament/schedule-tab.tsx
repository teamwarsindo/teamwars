"use client";

import { useState, useMemo, useEffect } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";

export interface ScheduleTabProps {
  schedules: MatchScheduleItem[];
  allTeamNames: string[];
  allWeeks: number[];
  isAdmin: boolean;
  onResetSchedules: () => void;
  onSelectMatch: (match: MatchScheduleItem) => void;
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  setSelectedGroupFilter: (v: "ALL" | "Group A" | "Group B") => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (v: string) => void;
  groupAName?: string;
  groupBName?: string;
  defaultWeek?: number;
}

export function ScheduleTab({
  schedules = [],
  allTeamNames = [],
  allWeeks = [],
  isAdmin,
  onResetSchedules,
  onSelectMatch,
  selectedGroupFilter,
  setSelectedGroupFilter,
  selectedDateFilter,
  setSelectedDateFilter,
  groupAName = "Divisi Group A",
  groupBName = "Divisi Group B",
  defaultWeek = 1,
}: ScheduleTabProps) {
  // Rentang minggu dari 1 s/d Week Aktif
  const availableWeeksUpToCurrent = useMemo(() => {
    const activeWeekNum = typeof defaultWeek === "number" && defaultWeek > 0 ? defaultWeek : 1;
    
    const weeksInSchedules = Array.from(
      new Set(schedules.map((s) => s.weekNumber || 1))
    ).filter((w) => w <= activeWeekNum);

    const fullRange = Array.from(
      new Set([...weeksInSchedules, ...Array.from({ length: activeWeekNum }, (_, i) => i + 1)])
    ).sort((a, b) => a - b);

    return fullRange;
  }, [schedules, defaultWeek]);

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "ALL">(defaultWeek);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

  useEffect(() => {
    if (typeof defaultWeek === "number" && defaultWeek > 0) {
      setSelectedWeekFilter(defaultWeek);
    }
  }, [defaultWeek]);

  // Pengecekan apakah ada filter yang sedang aktif
  const isFilterActive = useMemo(() => {
    return (
      selectedWeekFilter !== defaultWeek ||
      selectedGroupFilter !== "ALL" ||
      selectedTeamFilter !== "ALL" ||
      selectedDateFilter !== ""
    );
  }, [selectedWeekFilter, selectedGroupFilter, selectedTeamFilter, selectedDateFilter, defaultWeek]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((m) => {
      const mWeek = m.weekNumber || 1;

      if (selectedWeekFilter === "ALL") {
        if (mWeek > defaultWeek) return false;
      } else if (mWeek !== selectedWeekFilter) {
        return false;
      }

      if (selectedGroupFilter !== "ALL" && m.groupName !== selectedGroupFilter) return false;
      if (
        selectedTeamFilter !== "ALL" &&
        m.teamAName !== selectedTeamFilter &&
        m.teamBName !== selectedTeamFilter
      ) {
        return false;
      }
      if (selectedDateFilter && !m.matchDate.startsWith(selectedDateFilter)) return false;
      return true;
    });
  }, [
    schedules,
    selectedWeekFilter,
    selectedGroupFilter,
    selectedTeamFilter,
    selectedDateFilter,
    defaultWeek,
  ]);

  const groupedByWeek = useMemo(() => {
    const map = new Map<number, MatchScheduleItem[]>();
    filteredSchedules.forEach((m) => {
      const w = m.weekNumber || 1;
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(m);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filteredSchedules]);

  const handleResetFilters = () => {
    setSelectedWeekFilter(defaultWeek);
    setSelectedGroupFilter("ALL");
    setSelectedTeamFilter("ALL");
    setSelectedDateFilter("");
  };

  const formatDateLabel = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  return (
    <div className="space-y-4">
      {/* FILTER PANEL */}
      <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm space-y-3">
        {/* BUTTON FILTER DIVISI */}
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => setSelectedGroupFilter("ALL")}
            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            Semua Divisi
          </button>
          <button
            onClick={() => setSelectedGroupFilter("Group A")}
            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "Group A"
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {groupAName}
          </button>
          <button
            onClick={() => setSelectedGroupFilter("Group B")}
            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "Group B"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {groupBName}
          </button>
        </div>

        {/* DROPDOWN FILTER TIM, WEEK & TANGGAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* FILTER TIM */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Semua Tim</option>
            {allTeamNames.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* FILTER WEEK: TEKS SISTERM 'SEMUA WEEK' MURNI */}
          <select
            value={selectedWeekFilter}
            onChange={(e) =>
              setSelectedWeekFilter(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Semua Week</option>
            {availableWeeksUpToCurrent.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>

          {/* FILTER TANGGAL DENGAN KOTAK INPUT TANGGAL BAWAAN */}
          <div className="relative w-full">
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition cursor-pointer"
            />
          </div>
        </div>

        {/* BUTTON RESET FILTER & ADMIN SYNC */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
          <button
            onClick={handleResetFilters}
            disabled={!isFilterActive}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isFilterActive
                ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                : "bg-muted/40 text-muted-foreground border border-border/40 opacity-60 cursor-not-allowed"
            }`}
          >
            <span>🔄</span> Reset Filter
          </button>

          {isAdmin && (
            <button
              onClick={onResetSchedules}
              className="text-[11px] font-black text-rose-500 hover:text-rose-400 transition cursor-pointer"
            >
              ⚡ Sync Roulette & Jadwal
            </button>
          )}
        </div>
      </div>

      {/* LIST KARTU JADWAL */}
      {groupedByWeek.length === 0 ? (
        <div className="p-8 text-center text-xs font-bold text-muted-foreground bg-card border border-border rounded-2xl">
          🚫 Tidak ada jadwal pertandingan yang sesuai dengan filter.
        </div>
      ) : (
        groupedByWeek.map(([weekNum, matches]) => (
          <div key={weekNum} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1">
                🗓️ WEEK {weekNum}
              </span>
              <div className="h-[1px] flex-1 bg-border/60"></div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {matches.map((match) => {
                const isGroupA = match.groupName === "Group A" || match.groupName === groupAName;
                const groupDisplayName = isGroupA ? groupAName : groupBName;

                return (
                  <div
                    key={match.id}
                    onClick={() => onSelectMatch(match)}
                    className={`border transition p-3 rounded-2xl shadow-sm cursor-pointer space-y-2.5 ${
                      isGroupA
                        ? "bg-sky-500/5 border-sky-500/40 hover:border-sky-500"
                        : "bg-amber-500/5 border-amber-500/40 hover:border-amber-500"
                    }`}
                  >
                    {/* HEADER KARTU: NAMA DIVISI & TANGGAL */}
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span
                        className={`text-[10px] font-black uppercase ${
                          isGroupA ? "text-sky-500" : "text-amber-500"
                        }`}
                      >
                        {groupDisplayName}
                      </span>
                      <span className="text-muted-foreground">{formatDateLabel(match.matchDate)}</span>
                    </div>

                    {/* BODY KARTU: LOGO SELALU DI KIRI NAMA TIM */}
                    <div className="flex items-center justify-between gap-1.5 text-center">
                      {/* TEAM A (LOGO DI KIRI) */}
                      <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                        <img
                          src={match.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                        <span className="font-bold text-[11px] text-foreground break-words text-left leading-snug">
                          {match.teamAName}
                        </span>
                      </div>

                      {/* SKOR OTOMATIS TIDAK LONJONG */}
                      <div className="shrink-0 flex items-center justify-center px-1">
                        {match.isFinished || (match.scoreA || 0) + (match.scoreB || 0) > 0 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs whitespace-nowrap">
                            {match.scoreA} - {match.scoreB}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-extrabold text-[10px] whitespace-nowrap">
                            VS
                          </span>
                        )}
                      </div>

                      {/* TEAM B (LOGO DI KIRI) */}
                      <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                        <img
                          src={match.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                        <span className="font-bold text-[11px] text-foreground break-words text-left leading-snug">
                          {match.teamBName}
                        </span>
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
