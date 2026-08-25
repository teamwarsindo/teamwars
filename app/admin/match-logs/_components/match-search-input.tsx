"use client";

import { useState, useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { Search, X, ChevronRight, CheckCircle2, Shield, Radio, ShieldCheck, ShieldAlert } from "lucide-react";

interface MatchSearchInputProps {
  schedules: MatchScheduleItem[];
  onSelectMatch: (matchId: string) => void;
}

export function MatchSearchInput({ schedules, onSelectMatch }: MatchSearchInputProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const matchedResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase().trim();
    return schedules
      .filter((m) => {
        const str = `${m.teamAName} ${m.teamBName} ${m.referee || ""} ${m.streamer || ""} ${m.id} w${m.weekNumber || 1}`.toLowerCase();
        return str.includes(q);
      })
      .slice(0, 8);
  }, [schedules, globalSearch]);

  const handlePick = (matchId: string) => {
    onSelectMatch(matchId);
    setGlobalSearch("");
    setIsSearchFocused(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={globalSearch}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(e) => {
            setGlobalSearch(e.target.value);
            setIsSearchFocused(true);
          }}
          placeholder="Ketik nama tim, wasit, streamer, atau ID match"
          className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-sm focus:outline-hidden pl-10 pr-10 transition-all"
        />
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
        {globalSearch && (
          <button
            onClick={() => {
              setGlobalSearch("");
              setIsSearchFocused(false);
            }}
            className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearchFocused && globalSearch.trim() !== "" && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-border/60 max-h-80 overflow-y-auto">
          {matchedResults.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground font-medium">
              Tidak ada match yang cocok dengan "{globalSearch}"
            </div>
          ) : (
            matchedResults.map((m) => {
              const isChannelActive = Boolean(m.discordChannelId);

              return (
                <button
                  key={m.id}
                  onClick={() => handlePick(m.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/60 transition group cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mb-0.5">
                      <span className="font-bold text-primary">W{m.weekNumber || 1}</span>
                      <span>•</span>
                      <span>{m.id}</span>
                      {m.isFinished && (
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Selesai
                        </span>
                      )}
                      {/* Status Channel Discord */}
                      {isChannelActive ? (
                        <span className="flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-medium">
                          • Channel Aktif
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-muted-foreground/80 font-medium">
                          • Channel Dibersihkan
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {m.teamAName} <span className="text-muted-foreground font-normal">vs</span> {m.teamBName}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> {m.referee || "-"}</span>
                      <span className="flex items-center gap-1"><Radio className="h-2.5 w-2.5" /> {m.streamer || "-"}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
