import { DIVISION_MAP } from "@/app/tournament/_library";

export interface AnalyticsFilterMatchItem {
  id: string;
  weekNumber: number | string;
  groupName?: string;
  teamAName?: string;
  teamBName?: string;
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
}

export interface FilterTeamItem {
  name: string;
  slug: string;
  groupName?: string;
  logo?: string;
}

export interface AnalyticsFilterProps {
  mode: "reports" | "power-ranking";
  selectedGroup: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B;
  onGroupChange: (group: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => void;
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  teams: FilterTeamItem[];
  selectedWeek: number | "";
  onWeekChange: (week: number) => void;
  availableWeeks: number[];
  selectedMatchId?: string;
  onMatchChange?: (matchId: string) => void;
  matchesInView?: AnalyticsFilterMatchItem[];
  isFilterActive: boolean;
  onReset: () => void;
}
