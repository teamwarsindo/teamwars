"use client";

import { useMemo } from "react";

export interface ReportFilterMatchItem {
  id: string;
  weekNumber: number | string;
  groupName?: string;
  teamAName?: string;
  teamBName?: string;
  isFinished?: boolean;
}

interface ReportFilterProps {
  selectedWeek: number | "";
  onWeekChange: (week: number) => void;
  availableWeeks: number[];
  selectedMatchId: string;
  onMatchChange: (matchId: string) => void;
  matchesInView: ReportFilterMatchItem[];
  isFilterActive: boolean;
  onReset: () => void;
  searchTeam: string;
  onSearchTeamChange: (val: string) => void;
}

export function ReportFilter({
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedMatchId,
  onMatchChange,
  matchesInView,
  isFilterActive,
  onReset,
  searchTeam,
  onSearchTeamChange,
}: ReportFilterProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
      {/* Input Pencarian Nama Tim Multi-Week */}
      <div className="relative">
        <input
          type="text"
          value={searchTeam}
          onChange={(e) => onSearchTeamChange(e.target.value)}
          placeholder="🔍 Cari nama tim (lintas week)..."
          className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchTeam && (
          <button
            type="button"
            onClick={() => onSearchTeamChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Grid Pilihan Week & Match Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Dropdown Week */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Pilih Pekan
          </label>
          <select
            value={selectedWeek}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : "";
              if (val !== "") onWeekChange(val);
            }}
            disabled={Boolean(searchTeam.trim())}
            className={`w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
              searchTeam.trim() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <option value="">
              {searchTeam.trim() ? "Mode Cari Tim (Semua Week)" : "-- Pilih Week --"}
            </option>
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Pertandingan */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span>Pilih Pertandingan</span>
            {matchesInView.length > 0 && (
              <span className="text-[9px] text-muted-foreground font-mono font-normal">
                {matchesInView.length} Match
              </span>
            )}
          </label>
          <select
            value={selectedMatchId}
            onChange={(e) => onMatchChange(e.target.value)}
            disabled={matchesInView.length === 0}
            className={`w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
              matchesInView.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <option value="">
              {matchesInView.length === 0
                ? searchTeam.trim()
                  ? "Tim tidak ditemukan"
                  : "Pilih week dahulu"
                : "-- Pilih Pertandingan --"}
            </option>
            {matchesInView.map((m) => (
              <option key={m.id} value={m.id}>
                {searchTeam.trim() ? `[W${m.weekNumber}] ` : ""}
                {m.teamAName} vs {m.teamBName} {m.isFinished ? "✓" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tombol Reset saat ada filter aktif */}
      {isFilterActive && (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] text-muted-foreground hover:text-primary transition underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
