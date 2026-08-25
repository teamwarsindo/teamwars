"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { Search, X, Check } from "lucide-react";

interface MatchSearchInputProps {
  schedules: MatchScheduleItem[];
  onSelectMatch: (matchId: string) => void;
}

export function MatchSearchInput({ schedules, onSelectMatch }: MatchSearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-select match pertama jika ada data
  useEffect(() => {
    if (schedules.length > 0 && !selectedMatch) {
      setSelectedMatch(schedules[0]);
      onSelectMatch(schedules[0].id);
    }
  }, [schedules, selectedMatch, onSelectMatch]);

  // Filter pencarian
  const filteredMatches = useMemo(() => {
    if (!query.trim()) return schedules;
    const q = query.toLowerCase();
    return schedules.filter(
      (m) =>
        m.id?.toLowerCase().includes(q) ||
        m.teamAName?.toLowerCase().includes(q) ||
        m.teamBName?.toLowerCase().includes(q) ||
        m.teamACode?.toLowerCase().includes(q) ||
        m.teamBCode?.toLowerCase().includes(q) ||
        m.referee?.toLowerCase().includes(q) ||
        m.streamer?.toLowerCase().includes(q)
    );
  }, [schedules, query]);

  // Klik di luar untuk menutup dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (match: MatchScheduleItem) => {
    setSelectedMatch(match);
    onSelectMatch(match.id);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Cari tim, wasit, atau ID match..."
          className="w-full bg-card border border-border rounded-2xl py-3 pl-10 pr-10 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs transition"
        />
        <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 p-1 rounded-full text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Hasil Pencarian */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl z-50 space-y-1">
          {filteredMatches.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              Pertandingan tidak ditemukan.
            </div>
          ) : (
            filteredMatches.map((m) => {
              const isSelected = selectedMatch?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs ${
                    isSelected
                      ? "bg-primary/10 border border-primary/20 text-foreground font-semibold"
                      : "hover:bg-muted text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                      W{m.weekNumber || 1} • {m.id}
                    </span>
                    <span className="truncate">
                      <strong>{m.teamAName}</strong> vs <strong>{m.teamBName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      Wasit: {m.referee || "-"}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
