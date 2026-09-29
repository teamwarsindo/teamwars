import { TOURNAMENT_RULES } from "@/app/tournament/_library";
import { ScheduleItem } from "../_components/match-reports-view";
import { TeamRosterData } from "./power-ranking";

export interface FilterTeamItem {
  name: string;
  slug: string;
  groupName: string;
  logo?: string;
}

export function buildAllTeamsList(
  teams: TeamRosterData[],
  schedules: ScheduleItem[]
): FilterTeamItem[] {
  const map = new Map<string, FilterTeamItem>();

  teams.forEach((t) => {
    if (t.name) {
      map.set(t.name.toLowerCase(), {
        name: t.name,
        slug: t.slug || t.name.toLowerCase().replace(/\s+/g, "-"),
        groupName: t.groupName || "",
        logo: t.logo,
      });
    }
  });

  schedules.forEach((s) => {
    if (s.teamAName && !map.has(s.teamAName.toLowerCase())) {
      map.set(s.teamAName.toLowerCase(), {
        name: s.teamAName,
        slug: s.teamAName.toLowerCase().replace(/\s+/g, "-"),
        groupName: s.groupName || "",
        logo: s.teamALogo,
      });
    }
    if (s.teamBName && !map.has(s.teamBName.toLowerCase())) {
      map.set(s.teamBName.toLowerCase(), {
        name: s.teamBName,
        slug: s.teamBName.toLowerCase().replace(/\s+/g, "-"),
        groupName: s.groupName || "",
        logo: s.teamBLogo,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

interface MatchFilterOptions {
  schedule: ScheduleItem;
  currentTab: "reports" | "power-ranking";
  selectedGroup: string;
  selectedWeek: number | "ALL";
  selectedTeam: string;
  searchQuery: string;
}

export function matchScheduleFilter({
  schedule: s,
  currentTab,
  selectedGroup,
  selectedWeek,
  selectedTeam,
  searchQuery,
}: MatchFilterOptions): boolean {
  // Eliminasi pertandingan yang belum mulai pada tab reports
  if (currentTab === "reports") {
    const scoreA = s.scoreA ?? 0;
    const scoreB = s.scoreB ?? 0;
    const isStarted = Boolean(s.isFinished || scoreA > 0 || scoreB > 0);
    if (!isStarted) return false;
  }

  const isPlayoff =
    typeof selectedWeek === "number" &&
    selectedWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;
  const cleanQuery = searchQuery.trim().toLowerCase();

  // Filter Group hanya berlaku di tab power-ranking
  if (
    currentTab !== "reports" &&
    !isPlayoff &&
    selectedGroup !== "ALL" &&
    s.groupName !== selectedGroup
  ) {
    return false;
  }

  // Filter Pekan
  if (selectedWeek !== "ALL" && Number(s.weekNumber) !== Number(selectedWeek)) {
    return false;
  }

  // Filter Tim
  if (
    selectedTeam !== "" &&
    s.teamAName !== selectedTeam &&
    s.teamBName !== selectedTeam
  ) {
    return false;
  }

  // Filter Pencarian Teks (Tim, Babak/Stage, dan ID Match)
  if (cleanQuery) {
    const teamA = (s.teamAName || "").toLowerCase();
    const teamB = (s.teamBName || "").toLowerCase();
    const stageOrGroup = (s.groupName || (s as any).stage || "").toLowerCase();
    const matchId = (s.id || "").toLowerCase();

    return (
      teamA.includes(cleanQuery) ||
      teamB.includes(cleanQuery) ||
      stageOrGroup.includes(cleanQuery) ||
      matchId.includes(cleanQuery)
    );
  }

  return true;
}
