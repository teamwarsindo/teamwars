"use client";

import { useState, useMemo } from "react";
import {
  MatchReportData,
  TeamRosterData,
  calculatePowerRanking,
} from "../_library/power-ranking";
import { PowerRankingTable } from "./power-ranking-table";

interface PowerRankingViewProps {
  reports: MatchReportData[];
  teams: TeamRosterData[];
  maxActiveWeek: number;
}

type ScopeType = "GLOBAL" | "Anda Yakin?" | "Sakurasawa Fighters" | "TEAM";

export function PowerRankingView({
  reports,
  teams,
  maxActiveWeek,
}: PowerRankingViewProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(maxActiveWeek);
  const [activeScope, setActiveScope] = useState<ScopeType>("GLOBAL");
  const [selectedTeamSlug, setSelectedTeamSlug] = useState<string>(
    teams[0]?.slug || ""
  );

  const { players, grandTotal } = useMemo(() => {
    return calculatePowerRanking({
      reports,
      targetWeek: selectedWeek,
      teams,
      filterScope: activeScope,
      selectedTeamSlug,
    });
  }, [reports, teams, selectedWeek, activeScope, selectedTeamSlug]);

  const isTeamView = activeScope === "TEAM";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Filter Kontrol */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card/60 border border-border/40 p-2.5 rounded-xl backdrop-blur-sm">
        {/* Pilihan Week Kumulatif */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {Array.from({ length: maxActiveWeek }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWeek(w)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition shrink-0 ${
                selectedWeek === w
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              W{w}
            </button>
          ))}
        </div>

        {/* Scope: Global | Divisi | Team */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveScope("GLOBAL")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition shrink-0 ${
              activeScope === "GLOBAL"
                ? "bg-foreground text-background"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("Anda Yakin?")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition shrink-0 ${
              activeScope === "Anda Yakin?"
                ? "bg-sky-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            Anda Yakin?
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("Sakurasawa Fighters")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition shrink-0 ${
              activeScope === "Sakurasawa Fighters"
                ? "bg-amber-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            Sakurasawa
          </button>

          <select
            value={isTeamView ? selectedTeamSlug : ""}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedTeamSlug(e.target.value);
                setActiveScope("TEAM");
              }
            }}
            className={`text-[11px] font-bold py-1 px-2 rounded-lg border border-border/60 bg-card transition ${
              isTeamView
                ? "text-primary border-primary ring-1 ring-primary"
                : "text-muted-foreground"
            }`}
          >
            <option value="" disabled>
              Pilih Tim...
            </option>
            {teams.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Status Akumulasi */}
      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground font-semibold">
        <span>
          Menampilkan Data:{" "}
          <strong className="text-foreground font-bold">
            Kumulatif (Week 1 s/d Week {selectedWeek})
          </strong>
        </span>
        <span>
          Scope:{" "}
          <strong className="text-foreground uppercase font-bold">
            {isTeamView
              ? teams.find((t) => t.slug === selectedTeamSlug)?.name
              : activeScope}
          </strong>
        </span>
      </div>

      {/* Tabel */}
      <PowerRankingTable
        players={players}
        grandTotal={grandTotal}
        isTeamView={isTeamView}
      />
    </div>
  );
}
