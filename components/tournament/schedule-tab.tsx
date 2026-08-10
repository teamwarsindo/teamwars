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
  groupAName = "Divisi Group A",
  groupBName = "Divisi Group B",
  defaultWeek = 1,
}: ScheduleTabProps) {
  // 🟢 LOGIKA FILTER WEEK BERDASARKAN PROPS isAdmin
  // - Admin (isAdmin = true): Buka FULL WEEKS tanpa batasan
  // - Penonton (isAdmin = false): Dibatasi maksimal s/d Week Aktif
  const availableWeeksFilter = useMemo(() => {
    const allWeekNumbers = Array.from(
      new Set([...schedules.map((s) => s.weekNumber || 1), ...allWeeks])
    ).sort((a, b) => a - b);

    if (isAdmin) {
      return allWeekNumbers.length > 0 ? allWeekNumbers : [1];
    }

    const activeWeekNum = typeof defaultWeek === "number" && defaultWeek > 0 ? defaultWeek : 1;
    const restrictedWeeks = allWeekNumbers.filter((w) => w <= activeWeekNum);

    return restrictedWeeks.length > 0 ? restrictedWeeks : [1];
  }, [schedules, allWeeks, defaultWeek, isAdmin]);

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "ALL">(defaultWeek);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

  useEffect(() => {
    if (typeof defaultWeek === "number" && defaultWeek > 0) {
      setSelectedWeekFilter(defaultWeek);
    }
  }, [defaultWeek]);

  // Pengecekan status aktif filter
  const isFilterActive = useMemo(() => {
    return (
      selectedWeekFilter !== defaultWeek ||
      selectedGroupFilter !== "ALL" ||
      selectedTeamFilter !== "ALL"
    );
  }, [selectedWeekFilter, selectedGroupFilter, selectedTeamFilter, defaultWeek]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((m) => {
      const mWeek = m.weekNumber || 1;

      if (selectedWeekFilter === "ALL") {
        if (!isAdmin && mWeek > defaultWeek) return false;
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
      return true;
    });
  }, [
    schedules,
    selectedWeekFilter,
    selectedGroupFilter,
    selectedTeamFilter,
    defaultWeek,
    isAdmin,
  ]);

  // Grouping kartu per Week
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

  const renderMatchCard = (match: MatchScheduleItem) => {
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

        {/* BODY KARTU: NAMA TIM & LOGO & SKOR */}
        <div className="grid grid-cols-7 items-center gap-1 text-center">
          {/* TIM KIRI */}
          <div className="col-span-3 flex items-center justify-end gap-1.5 min-w-0 pr-1">
            <span className="font-bold text-[11px] text-foreground break-words text-right leading-snug">
              {match.teamAName}
            </span>
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
          </div>

          {/* BADGE SKOR / VS */}
          <div className="col-span-1 flex justify-center">
            {match.isFinished || (match.scoreA || 0) + (match.scoreB || 0) > 0 ? (
              <span className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs whitespace-nowrap">
                {match.scoreA} - {match.scoreB}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-black text-[11px] shadow-xs whitespace-nowrap">
                VS
              </span>
            )}
          </div>

          {/* TIM KANAN */}
          <div className="col-span-3 flex items-center justify-start gap-1.5 min-w-0 pl-1">
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
  };

  return (
    <div className="space-y-4">
      {/* FILTER PANEL */}
      <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm space-y-3">
        {/* BARIS 1: BUTTON FILTER DIVISI */}
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

        {/* BARIS 2: DROPDOWN TIM, WEEK & RESET FILTER */}
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

          {/* FILTER WEEK */}
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
            {availableWeeksFilter.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>

          {/* TOMBOL RESET FILTER */}
          <button
            onClick={handleResetFilters}
            disabled={!isFilterActive}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isFilterActive
                ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                : "bg-muted/30 text-muted-foreground/60 border border-border/30 cursor-not-allowed"
            }`}
          >
            <span>🔄</span> Reset Filter
          </button>
        </div>

        {/* TOMBOL SYNC HANYA UNTUK ADMIN */}
        {isAdmin && (
          <div className="pt-2 border-t border-border/30 text-right">
            <button
              onClick={onResetSchedules}
              className="text-[11px] font-black text-rose-500 hover:text-rose-400 transition cursor-pointer"
            >
              ⚡ Sync Roulette & Jadwal
            </button>
          </div>
        )}
      </div>

      {/* LIST KARTU JADWAL PER WEEK */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matches.map((m) => renderMatchCard(m))}
            </div>
          </div>
        ))
      )}
    </div>
  );
      }
            
