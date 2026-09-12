"use client";

import { useState, useRef, useEffect, useMemo } from "react";

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
  allAvailableMatches: ReportFilterMatchItem[];
  onSelectFromSearch: (match: ReportFilterMatchItem) => void;
  isFilterActive: boolean;
  onReset: () => void;
}

export function ReportFilter({
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedMatchId,
  onMatchChange,
  matchesInView,
  allAvailableMatches,
  onSelectFromSearch,
  isFilterActive,
  onReset,
}: ReportFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter pencarian multi-week
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    return allAvailableMatches.filter(
      (m) =>
        m.teamAName?.toLowerCase().includes(q) ||
        m.teamBName?.toLowerCase().includes(q)
    );
  }, [searchTerm, allAvailableMatches]);

  // Tutup popup & bersihkan teks jika user klik di luar tanpa memilih
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm(""); // Otomatis hapus agar tidak merusak filter dropdown
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMatch = (m: ReportFilterMatchItem) => {
    onSelectFromSearch(m);
    setSearchTerm(""); // Kembali kosong setelah memilih
    setIsOpen(false);
  };

  return (
    <div className="space-y-2.5">
      {/* 1. SEARCH BAR AUTOCOMPLETE (Berdiri Sendiri di Atas) */}
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setIsOpen(true);
            }}
            placeholder="🔍 Cari nama tim (misal: FPF, Licht)..."
            className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setIsOpen(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Floating Dropdown Hasil Pencarian */}
        {isOpen && searchTerm.trim() && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
            {searchResults.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Tidak ada pertandingan untuk tim &quot;{searchTerm}&quot;
              </div>
            ) : (
              searchResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMatch(m)}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted/70 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-primary mr-1.5">[W{m.weekNumber}]</span>
                    <span className="font-medium text-foreground">{m.teamAName}</span>
                    <span className="text-muted-foreground text-[10px] mx-1">vs</span>
                    <span className="font-medium text-foreground">{m.teamBName}</span>
                  </div>
                  {m.isFinished && (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Selesai ✓
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 2. FILTER DROPDOWN ASLI (Tetap bawaan tema & normal) */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
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
              className="w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">-- Pilih Week --</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Match */}
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
              className={`w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${
                matchesInView.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <option value="">
                {matchesInView.length === 0
                  ? "Pilih week dahulu"
                  : "-- Pilih Pertandingan --"}
              </option>
              {matchesInView.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.teamAName} vs {m.teamBName} {m.isFinished ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tombol Reset Filter */}
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
    </div>
  );
}
