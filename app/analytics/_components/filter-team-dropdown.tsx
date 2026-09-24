"use client";

import Image from "next/image";
import { FilterTeamItem } from "./analytics-filter";

interface FilterTeamDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedTeam: string;
  onSelectTeam: (teamName: string) => void;
  filteredTeams: FilterTeamItem[];
  allTeams: FilterTeamItem[];
}

export function FilterTeamDropdown({
  isOpen,
  onToggle,
  selectedTeam,
  onSelectTeam,
  filteredTeams,
  allTeams,
}: FilterTeamDropdownProps) {
  const selectedTeamObj = allTeams.find((t) => t.name === selectedTeam);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedTeamObj?.logo && (
            <div className="h-3.5 w-3.5 rounded-full overflow-hidden shrink-0 border border-border/60">
              <Image
                src={selectedTeamObj.logo}
                alt={selectedTeamObj.name}
                width={14}
                height={14}
                className="h-full w-full object-cover rounded-full"
                unoptimized
              />
            </div>
          )}
          <span className="truncate">{selectedTeam || "Semua Tim"}</span>
        </div>
        <span className={`text-[10px] text-primary transition-transform ml-1 shrink-0 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectTeam("ALL")}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
              !selectedTeam ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
            }`}
          >
            <span>Semua Tim</span>
            {!selectedTeam && <span>✓</span>}
          </button>

          {filteredTeams.map((t) => {
            const isSelected = selectedTeam === t.name;
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => onSelectTeam(t.name)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                  isSelected ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {t.logo && (
                    <div className="h-4 w-4 rounded-full overflow-hidden shrink-0 border border-border/60">
                      <Image
                        src={t.logo}
                        alt={t.name}
                        width={16}
                        height={16}
                        className="h-full w-full object-cover rounded-full"
                        unoptimized
                      />
                    </div>
                  )}
                  <span className="truncate">{t.name}</span>
                </div>
                {isSelected && <span className="ml-1 shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
