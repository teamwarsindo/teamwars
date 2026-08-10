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
  defaultWeek,
}: ScheduleTabProps) {
  // 🟢 1. FILTER WEEK DEFAULTS KETIKAN AWAL DIMUAT (WEEK 2 / CURRENT WEEK)
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "ALL">(
    defaultWeek ?? (allWeeks.length > 0 ? allWeeks[0] : "ALL")
  );

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

  // Sinkronkan selectedWeekFilter jika defaultWeek berubah dari parent
  useEffect(() => {
    if (typeof defaultWeek === "number" && defaultWeek > 0) {
      setSelectedWeekFilter(defaultWeek);
    }
  }, [defaultWeek]);

  // 🟢 2. LOGIKA PEMFILTERAN JADWAL (WEEK, GROUP, TEAM, TANGGAL)
  const filteredSchedules = useMemo(() => {
    return schedules.filter((m) => {
      // Filter Week
      if (selectedWeekFilter !== "ALL" && m.weekNumber !== selectedWeekFilter) {
        return false;
      }
      // Filter Group
      if (selectedGroupFilter !== "ALL" && m.groupName !== selectedGroupFilter) {
        return false;
      }
      // Filter Team
      if (
        selectedTeamFilter !== "ALL" &&
        m.teamAName !== selectedTeamFilter &&
        m.teamBName !== selectedTeamFilter
      ) {
        return false;
      }
      // Filter Date
      if (selectedDateFilter && !m.matchDate.startsWith(selectedDateFilter)) {
        return false;
      }
      return true;
    });
  }, [
    schedules,
    selectedWeekFilter,
    selectedGroupFilter,
    selectedTeamFilter,
    selectedDateFilter,
  ]);

  // Grouping pertandingan berdasarkan Week
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
    setSelectedWeekFilter(defaultWeek ?? "ALL");
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
      {/* KOTAK FILTER JADWAL */}
      <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm space-y-3">
        {/* BUTTON DIVISI GROUP FILTER */}
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => setSelectedGroupFilter("ALL")}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer truncate ${
              selectedGroupFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            Semua Divisi
          </button>
          <button
            onClick={() => setSelectedGroupFilter("Group A")}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer truncate ${
              selectedGroupFilter === "Group A"
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {groupAName}
          </button>
          <button
            onClick={() => setSelectedGroupFilter("Group B")}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer truncate ${
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
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Semua Tim</option>
            {allTeamNames.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* FILTER WEEK (DEFAULT TERKUNCI MINGGU BERJALAN) */}
          <select
            value={selectedWeekFilter}
            onChange={(e) =>
              setSelectedWeekFilter(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-primary focus:outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Semua Week</option>
            {allWeeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>

          {/* FILTER TANGGAL */}
          <input
            type="date"
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition cursor-pointer"
          />
        </div>

        {/* RESET FILTER & ADMIN SYNC BUTTON */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            🔄 Reset Filter
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

      {/* LIST KARTU JADWAL PER WEEK */}
      {groupedByWeek.length === 0 ? (
        <div className="p-8 text-center text-xs font-bold text-muted-foreground bg-card border border-border rounded-2xl">
          🚫 Tidak ada jadwal pertandingan yang sesuai dengan filter.
        </div>
      ) : (
        groupedByWeek.map(([weekNum, matches]) => (
          <div key={weekNum} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-primary tracking-wider">
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
                    className="bg-card border border-border hover:border-primary/50 transition p-3 rounded-2xl shadow-sm cursor-pointer space-y-2.5"
                  >
                    {/* CARD HEADER: NAMA DIVISI & TANGGAL */}
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase ${
                          isGroupA
                            ? "bg-sky-500/15 text-sky-500 border border-sky-500/20"
                            : "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                        }`}
                      >
                        {groupDisplayName}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDateLabel(match.matchDate)}
                      </span>
                    </div>

                    {/* CARD BODY: TIM A vs TIM B & SKOR */}
                    <div className="grid grid-cols-7 items-center gap-1 text-center">
                      {/* TEAM A */}
                      <div className="col-span-3 flex items-center justify-end gap-1.5 min-w-0">
                        <span className="font-bold text-[11px] text-foreground truncate text-right">
                          {match.teamAName}
                        </span>
                        <img
                          src={match.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      </div>

                      {/* SCORE / VS BADGE */}
                      <div className="col-span-1 flex justify-center">
                        {match.isFinished || (match.scoreA || 0) + (match.scoreB || 0) > 0 ? (
                          <span className="px-2 py-1 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs">
                            {match.scoreA} - {match.scoreB}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-extrabold text-[10px]">
                            VS
                          </span>
                        )}
                      </div>

                      {/* TEAM B */}
                      <div className="col-span-3 flex items-center justify-start gap-1.5 min-w-0">
                        <img
                          src={match.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                        <span className="font-bold text-[11px] text-foreground truncate text-left">
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
        
