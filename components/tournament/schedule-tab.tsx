"use client";

import { useState } from "react";
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

  const sortedTeams = [...allTeamNames].sort((a, b) => a.localeCompare(b));
  const sortedWeeks = [...allWeeks].sort((a, b) => a - b);

  const filteredSchedules = schedules.filter((m) => {
    const matchGroup = selectedGroupFilter === "ALL" || m.groupName === selectedGroupFilter;
    const matchTeam = selectedTeamFilter === "ALL" || m.teamAName === selectedTeamFilter || m.teamBName === selectedTeamFilter;
    const matchWeek = selectedWeekFilter === "ALL" || String(m.weekNumber) === selectedWeekFilter;

    if (!selectedDateFilter) return matchGroup && matchTeam && matchWeek;
    const mDate = new Date(m.matchDate).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    return matchGroup && matchTeam && matchWeek && mDate === selectedDateFilter;
  });

  const groupedSchedulesByWeek = filteredSchedules.reduce((acc, match) => {
    const weekKey = `Week ${match.weekNumber}`;
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(match);
    return acc;
  }, {} as Record<string, typeof filteredSchedules>);

  return (
    <div className="flex flex-col gap-4">
      {/* Control Panel Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        
        {/* Tombol Filter Grup: Group A, Group B, All Group */}
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
                selectedGroupFilter === g.key ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Dropdown Tim, Week, & Icon Tanggal Minimalis */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">🔍 Pilih Tim (A-Z)</option>
              {sortedTeams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="w-28 sm:w-36">
            <select
              value={selectedWeekFilter}
              onChange={(e) => setSelectedWeekFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">📅 Minggu</option>
              {sortedWeeks.map((w) => (
                <option key={w} value={String(w)}>Week {w}</option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center justify-center">
            <label
              htmlFor="date-picker-input"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
                selectedDateFilter
                  ? "bg-sky-500/20 border-sky-500 text-sky-400"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Filter Tanggal"
            >
              📅
            </label>
            <input
              id="date-picker-input"
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {(selectedDateFilter || selectedTeamFilter !== "ALL" || selectedWeekFilter !== "ALL") && (
            <button
              onClick={() => {
                setSelectedDateFilter("");
                setSelectedTeamFilter("ALL");
                setSelectedWeekFilter("ALL");
              }}
              className="rounded-xl bg-rose-500/20 px-2.5 py-2 text-[10px] font-bold text-rose-400 hover:bg-rose-500/30 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <button onClick={onResetSchedules} className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 py-2 text-xs font-bold text-sky-400 cursor-pointer">
          🔄 Buat Ulang Jadwal Default (Rabu-Sabtu 20:00 WIB)
        </button>
      )}

      {/* Match List */}
      {Object.keys(groupedSchedulesByWeek).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs font-bold text-muted-foreground">
          ⚠️ Tidak ada jadwal pertandingan pada filter ini.
        </div>
      ) : (
        Object.entries(groupedSchedulesByWeek).map(([weekTitle, matchGroup]) => (
          <div key={weekTitle} className="flex flex-col gap-3">
            <div className="flex items-center justify-center border-b border-primary/30 pb-1">
              <span className="text-xs font-black uppercase text-primary tracking-wider text-center">{weekTitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchGroup.map((match) => (
                <div
                  key={match.id}
                  onClick={() => onSelectMatch(match)}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 text-[10px]">
                    <span className={`font-bold ${match.groupName === "Group A" ? "text-sky-400" : "text-amber-400"}`}>{match.groupName}</span>
                    <span className="font-semibold text-primary">
                      {new Date(match.matchDate).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" })} - 20.00 WIB
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-2 gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img src={match.teamALogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                      <span className="text-xs font-bold truncate">{match.teamAName}</span>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-background border border-border font-black text-sm shrink-0">
                      <span>{match.scoreA}</span><span>-</span><span>{match.scoreB}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-right truncate">{match.teamBName}</span>
                      <img src={match.teamBLogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
