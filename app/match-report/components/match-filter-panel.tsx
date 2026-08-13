"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronDown, Check, RefreshCw, RotateCcw } from "lucide-react";

interface MatchFilterPanelProps {
  selectedGroup: "ALL" | "Group A" | "Group B";
  onSelectGroup: (group: "ALL" | "Group A" | "Group B") => void;
  selectedWeek: number | "ALL";
  onSelectWeek: (week: number | "ALL") => void;
  availableWeeks: number[];
  isRefreshingKv: boolean;
  onRefreshKv: () => void;
  onResetFilter: () => void;
}

export function MatchFilterPanel({
  selectedGroup,
  onSelectGroup,
  selectedWeek,
  onSelectWeek,
  availableWeeks,
  isRefreshingKv,
  onRefreshKv,
  onResetFilter,
}: MatchFilterPanelProps) {
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const weekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weekRef.current && !weekRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFilterActive = selectedWeek !== "ALL" || selectedGroup !== "ALL";

  return (
    <div className="glass glow-border border border-border p-4 rounded-2xl shadow-sm space-y-3">
      {/* FILTER DIVISI */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {(["ALL", "Group A", "Group B"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onSelectGroup(g)}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer leading-snug ${
              selectedGroup === g
                ? g === "Group A"
                  ? "bg-sky-500 text-white shadow-sm"
                  : g === "Group B"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {g === "ALL" ? "Semua Divisi" : g}
          </button>
        ))}
      </div>

      {/* DROPDOWN WEEK, REFRESH, RESET */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* DROPDOWN WEEK */}
        <div className="relative" ref={weekRef}>
          <button
            type="button"
            onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
            className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span className="truncate">{selectedWeek === "ALL" ? "Semua Week" : `Week ${selectedWeek}`}</span>
            <ChevronDown className={`h-4 w-4 text-primary transition-transform ${isWeekDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isWeekDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  onSelectWeek("ALL");
                  setIsWeekDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedWeek === "ALL" ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                }`}
              >
                <span>Semua Week</span>
                {selectedWeek === "ALL" && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>

              {availableWeeks.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    onSelectWeek(w);
                    setIsWeekDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedWeek === w ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span>Week {w}</span>
                  {selectedWeek === w && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* REFRESH KV */}
        <button
          type="button"
          onClick={onRefreshKv}
          disabled={isRefreshingKv}
          className="w-full py-2.5 px-3 rounded-xl border border-border bg-background/80 text-xs font-bold text-foreground transition flex items-center justify-center gap-2 hover:bg-muted cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isRefreshingKv ? "animate-spin text-primary" : ""}`} />
          <span>{isRefreshingKv ? "Syncing..." : "Refresh KV Data"}</span>
        </button>

        {/* RESET FILTER */}
        <button
          type="button"
          onClick={onResetFilter}
          disabled={!isFilterActive}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            isFilterActive
              ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
              : "bg-muted/30 text-muted-foreground/60 border border-border/30 cursor-not-allowed"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span>Reset Filter</span>
        </button>
      </div>
    </div>
  );
}
