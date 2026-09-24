"use client";

import { DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";

export type StageScopeType = "ALL" | "GROUP_ONLY" | "PLAYOFF_ONLY";

interface FilterGroupToggleProps {
  mode: "reports" | "power-ranking";
  selectedGroup: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B;
  stageScope: StageScopeType;
  currentTournamentWeek: number;
  selectedWeek: number | "ALL";
  isPlayoffWeek: boolean;
  selectedTeam?: string;
  selectedTeamHasPlayoff?: boolean;
  onToggleGroup: (group: typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => void;
  onToggleStageScope: (scope: "GROUP_ONLY" | "PLAYOFF_ONLY") => void;
}

export function FilterGroupToggle({
  mode,
  selectedGroup,
  stageScope,
  currentTournamentWeek,
  selectedWeek,
  isPlayoffWeek,
  selectedTeam,
  selectedTeamHasPlayoff = true,
  onToggleGroup,
  onToggleStageScope,
}: FilterGroupToggleProps) {
  if (mode === "power-ranking") {
    // KUNCI HANYA JIKA: User sedang melihat pekan babak grup (Week 1 - 7)
    const isExplicitGroupWeek =
      typeof selectedWeek === "number" && selectedWeek < TOURNAMENT_RULES.PLAYOFF_START_WEEK;

    const evaluatedWeek = typeof selectedWeek === "number" ? selectedWeek : currentTournamentWeek;
    const canAccessPlayoff = evaluatedWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

    // Tim yang tidak main di playoff
    const isNonPlayoffTeam = Boolean(selectedTeam) && !selectedTeamHasPlayoff;

    // Status aktif
    const isGroupActive = stageScope === "GROUP_ONLY" || isExplicitGroupWeek;
    const isPlayoffActive = stageScope === "PLAYOFF_ONLY";

    // Tombol Group Terkunci HANYA jika week memang berada di babak grup
    const isGroupLocked = isExplicitGroupWeek;

    // Tombol Playoff Mati jika: belum masuk week playoff ATAU tim terpilih bukan tim playoff
    const isPlayoffDisabled = !canAccessPlayoff || isNonPlayoffTeam;

    return (
      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          disabled={isGroupLocked}
          onClick={() => onToggleStageScope("GROUP_ONLY")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center truncate ${
            isGroupActive
              ? isGroupLocked
                ? "bg-sky-500 text-white shadow-xs cursor-default"
                : "bg-sky-500 text-white shadow-xs cursor-pointer"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30 cursor-pointer"
          }`}
        >
          Group Only
        </button>

        <button
          type="button"
          disabled={isPlayoffDisabled}
          onClick={() => onToggleStageScope("PLAYOFF_ONLY")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center truncate ${
            isPlayoffDisabled
              ? "bg-muted/10 text-muted-foreground/30 border border-border/20 cursor-not-allowed"
              : isPlayoffActive
              ? "bg-emerald-500 text-white shadow-xs cursor-pointer"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30 cursor-pointer"
          }`}
        >
          Playoff Only
        </button>
      </div>
    );
  }

  // Mode Reports
  const cleanNameA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanNameB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <button
        type="button"
        disabled={isPlayoffWeek}
        onClick={() => onToggleGroup(DIVISION_MAP.GROUP_A)}
        className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center truncate ${
          isPlayoffWeek
            ? "bg-muted/10 text-muted-foreground/30 border border-border/20 cursor-not-allowed"
            : selectedGroup === DIVISION_MAP.GROUP_A
            ? "bg-sky-500 text-white shadow-xs cursor-pointer"
            : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30 cursor-pointer"
        }`}
      >
        {cleanNameA}
      </button>

      <button
        type="button"
        disabled={isPlayoffWeek}
        onClick={() => onToggleGroup(DIVISION_MAP.GROUP_B)}
        className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center truncate ${
          isPlayoffWeek
            ? "bg-muted/10 text-muted-foreground/30 border border-border/20 cursor-not-allowed"
            : selectedGroup === DIVISION_MAP.GROUP_B
            ? "bg-amber-500 text-white shadow-xs cursor-pointer"
            : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30 cursor-pointer"
        }`}
      >
        {cleanNameB}
      </button>
    </div>
  );
}
