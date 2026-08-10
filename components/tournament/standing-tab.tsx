"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";
import { ChevronDown, Check } from "lucide-react";

interface StandingTabProps {
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
  groupAName?: string;
  groupBName?: string;
}

export function StandingTab({
  schedules = [],
  masterTeams = [],
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
}: StandingTabProps) {
  // Filter Divisi: "ALL" | Group A | Group B
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hitung Klasemen Akumulatif
  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  // Kelompokkan per Divisi
  const groupAStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A || s.groupName === groupAName);
  }, [standings, groupAName]);

  const groupBStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B || s.groupName === groupBName);
  }, [standings, groupBName]);

  const getGroupLabelText = (key: string) => {
    if (key === "Group A") return groupAName;
    if (key === "Group B") return groupBName;
    return "Semua Divisi";
  };

  return (
    <div className="space-y-4">
      {/* FILTER PANEL DENGAN CUSTOM SELECT UI */}
      <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black uppercase text-primary tracking-wider">
              KLASEMEN GRUP &amp; KUALIFIKASI
            </h3>
            <p className="text-[11px] text-muted-foreground font-semibold">
              Top 2 masing-masing divisi lolos otomatis ke Quarter-Final. Top 8 tersisa masuk Play-Ins.
            </p>
          </div>

          {/* CUSTOM DROPDOWN POPOVER SELECT */}
          <div className="relative min-w-[180px]" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">{getGroupLabelText(selectedGroupFilter)}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-full min-w-[200px] rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                {[
                  { key: "ALL", label: "Semua Divisi" },
                  { key: "Group A", label: groupAName },
                  { key: "Group B", label: groupBName },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSelectedGroupFilter(item.key);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedGroupFilter === item.key
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-popover-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {selectedGroupFilter === item.key && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE STANDING: GROUP A */}
      {(selectedGroupFilter === "ALL" || selectedGroupFilter === "Group A") && (
        <StandingTableSection title={groupAName} standings={groupAStandings} colorTheme="sky" />
      )}

      {/* TABLE STANDING: GROUP B */}
      {(selectedGroupFilter === "ALL" || selectedGroupFilter === "Group B") && (
        <StandingTableSection title={groupBName} standings={groupBStandings} colorTheme="amber" />
      )}
    </div>
  );
}

// Helper Render Tabel Klasemen
function StandingTableSection({
  title,
  standings,
  colorTheme,
}: {
  title: string;
  standings: any[];
  colorTheme: "sky" | "amber";
}) {
  const isSky = colorTheme === "sky";

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* HEADER DIVISI */}
      <div
        className={`px-4 py-2.5 border-b font-black text-xs uppercase flex items-center justify-between ${
          isSky
            ? "bg-sky-500/10 border-sky-500/30 text-sky-500"
            : "bg-amber-500/10 border-amber-500/30 text-amber-500"
        }`}
      >
        <span>{title}</span>
        <span className="text-[10px] opacity-80">{standings.length} Teams</span>
      </div>

      {/* TABEL DATA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-extrabold text-[10px] uppercase">
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3">Tim</th>
              <th className="py-2.5 px-2 text-center">M</th>
              <th className="py-2.5 px-2 text-center">W</th>
              <th className="py-2.5 px-2 text-center">L</th>
              <th className="py-2.5 px-2 text-center">GW</th>
              <th className="py-2.5 px-2 text-center">GL</th>
              <th className="py-2.5 px-2 text-center">GD</th>
              <th className="py-2.5 px-3 text-center font-black text-foreground">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-semibold">
            {standings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-muted-foreground font-bold">
                  Belum ada data klasemen untuk divisi ini.
                </td>
              </tr>
            ) : (
              standings.map((team, idx) => {
                const rank = idx + 1;
                const isDirectQual = rank <= 2; // Rank 1 & 2 Lolos Langsung QF

                return (
                  <tr
                    key={team.teamName}
                    className={`hover:bg-muted/30 transition ${
                      isDirectQual ? (isSky ? "bg-sky-500/5" : "bg-amber-500/5") : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-black text-muted-foreground">
                      {rank}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <img
                          src={team.teamLogo || "/logo.webp"}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                        <span className="truncate">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">{team.played || 0}</td>
                    <td className="py-2.5 px-2 text-center text-emerald-500 font-extrabold">
                      {team.won || 0}
                    </td>
                    <td className="py-2.5 px-2 text-center text-rose-500 font-extrabold">
                      {team.lost || 0}
                    </td>
                    <td className="py-2.5 px-2 text-center">{team.gameWon || 0}</td>
                    <td className="py-2.5 px-2 text-center">{team.gameLost || 0}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold">
                      {(team.gameWon || 0) - (team.gameLost || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-primary text-xs">
                      {team.points || 0}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
