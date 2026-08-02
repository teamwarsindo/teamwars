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
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="grid grid-cols-3 gap-2 w-full">
          {(["ALL", "Group A", "Group B"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroupFilter(g)}
              className={`rounded-lg py-2 px-3 text-[10px] font-bold uppercase cursor-pointer ${
                selectedGroupFilter === g ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {g === "ALL" ? "Semua Grup" : g}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={selectedTeamFilter} onChange={(e) => setSelectedTeamFilter(e.target.value)} className="rounded-lg border border-border bg-background p-1.5 text-xs">
            <option value="ALL">Semua Tim</option>
            {allTeamNames.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={selectedWeekFilter} onChange={(e) => setSelectedWeekFilter(e.target.value)} className="rounded-lg border border-border bg-background p-1.5 text-xs">
            <option value="ALL">Semua Week</option>
            {allWeeks.map((w) => <option key={w} value={String(w)}>Week {w}</option>)}
          </select>

          <input type="date" value={selectedDateFilter} onChange={(e) => setSelectedDateFilter(e.target.value)} className="rounded-lg border border-border bg-background p-1.5 text-xs" />
        </div>
      </div>

      {isAdmin && (
        <button onClick={onResetSchedules} className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 py-2 text-xs font-bold text-sky-400">
          🔄 Buat Ulang Jadwal Default (Rabu-Sabtu 20:00 WIB)
        </button>
      )}

      {/* List Schedules */}
      {Object.keys(groupedSchedulesByWeek).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs font-bold text-muted-foreground">
          ⚠️ Tidak ada jadwal pertandingan pada filter ini.
        </div>
      ) : (
        Object.entries(groupedSchedulesByWeek).map(([weekTitle, matchGroup]) => (
          <div key={weekTitle} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-primary/30 pb-1">
              <span className="text-xs font-black uppercase text-primary">{weekTitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchGroup.map((match) => (
                <div
                  key={match.id}
                  onClick={() => onSelectMatch(match)}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/50 cursor-pointer"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 text-[10px]">
                    <span className={`font-bold ${match.groupName === "Group A" ? "text-sky-400" : "text-amber-400"}`}>{match.groupName}</span>
                    <span className="font-semibold text-primary">{new Date(match.matchDate).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" })} - 20.00 WIB</span>
                  </div>

                  <div className="flex items-center justify-between my-2 gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img src={match.teamALogo} alt="" className="h-7 w-7 object-contain shrink-0" />
                      <span className="text-xs font-bold truncate">{match.teamAName}</span>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-background border border-border font-black text-sm">
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
                
