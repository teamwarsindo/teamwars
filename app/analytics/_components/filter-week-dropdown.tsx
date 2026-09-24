"use client";

interface FilterWeekDropdownProps {
  mode: "reports" | "power-ranking";
  isOpen: boolean;
  onToggle: () => void;
  selectedWeek: number | "ALL";
  onSelectWeek: (week: number | "ALL") => void;
  availableWeeks: number[];
  isFilterActive: boolean;
  onReset: () => void;
}

export function FilterWeekDropdown({
  mode,
  isOpen,
  onToggle,
  selectedWeek,
  onSelectWeek,
  availableWeeks,
  isFilterActive,
  onReset,
}: FilterWeekDropdownProps) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition focus:outline-none cursor-pointer"
        >
          <span className="truncate">
            {selectedWeek === "ALL" ? "Semua Week" : `Week ${selectedWeek}`}
          </span>
          <span className={`text-[10px] text-primary transition-transform ml-1 shrink-0 ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
            {mode === "reports" && (
              <button
                type="button"
                onClick={() => onSelectWeek("ALL")}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                  selectedWeek === "ALL" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span>Semua Week</span>
                {selectedWeek === "ALL" && <span>✓</span>}
              </button>
            )}

            {availableWeeks.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onSelectWeek(w)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                  selectedWeek === w ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span>Week {w}</span>
                {selectedWeek === w && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={!isFilterActive}
        title="Reset Filter"
        className={`h-9 w-9 rounded-xl flex items-center justify-center bg-rose-500 text-white shadow-xs transition shrink-0 cursor-pointer ${
          !isFilterActive ? "opacity-35 cursor-not-allowed" : "hover:bg-rose-600 active:scale-95"
        }`}
      >
        <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
