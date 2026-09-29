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
  reportsMap: Map<string, any>;
}

function findReportByScheduleId(scheduleId: string, reportsMap: Map<string, any>): any {
  if (!scheduleId) return undefined;
  const rawId = String(scheduleId).trim();
  
  if (reportsMap.has(rawId)) return reportsMap.get(rawId);
  
  const cleanId = rawId.toLowerCase();
  if (reportsMap.has(cleanId)) return reportsMap.get(cleanId);

  const numOnly = cleanId.replace(/\D/g, "");
  if (numOnly) {
    if (reportsMap.has(`match-${numOnly}`)) return reportsMap.get(`match-${numOnly}`);
    if (reportsMap.has(numOnly)) return reportsMap.get(numOnly);
  }

  return undefined;
}

export function matchScheduleFilter({
  schedule: s,
  currentTab,
  selectedGroup,
  selectedWeek,
  selectedTeam,
  searchQuery,
  reportsMap,
}: MatchFilterOptions): boolean {
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

  // Filter Pencarian Teks Universal
  if (cleanQuery) {
    const teamA = (s.teamAName || "").toLowerCase();
    const teamB = (s.teamBName || "").toLowerCase();
    const stageOrGroup = (s.groupName || (s as any).stage || "").toLowerCase();
    const matchId = (s.id || "").toLowerCase();

    // 1. Cek nama tim, stage, dan ID match
    if (
      teamA.includes(cleanQuery) ||
      teamB.includes(cleanQuery) ||
      stageOrGroup.includes(cleanQuery) ||
      matchId.includes(cleanQuery)
    ) {
      return true;
    }

    // 2. Cek personel langsung pada objek schedule (wasit / streamer)
    const directReferee = String((s as any).referee || (s as any).wasit || "").toLowerCase();
    const directStreamer = String((s as any).streamer || (s as any).caster || "").toLowerCase();
    if (directReferee.includes(cleanQuery) || directStreamer.includes(cleanQuery)) {
      return true;
    }

    // 3. Cek personel dan pemain dari laporan duel (reportsMap)
    const rep = findReportByScheduleId(s.id, reportsMap);
    if (rep) {
      const repMeta = typeof rep.metadata === "object" ? rep.metadata : {};
      const repReferee = String(repMeta?.referee || rep.referee || "").toLowerCase();
      const repStreamer = String(repMeta?.streamer || rep.streamer || "").toLowerCase();

      if (repReferee.includes(cleanQuery) || repStreamer.includes(cleanQuery)) {
        return true;
      }

      const lineupA: any[] = rep.teamA?.lineup || [];
      const lineupB: any[] = rep.teamB?.lineup || [];
      const hasInLineup = [...lineupA, ...lineupB].some((p: any) =>
        String(p?.ign || p?.name || "").toLowerCase().includes(cleanQuery)
      );
      if (hasInLineup) return true;

      const games: any[] = rep.games || [];
      const hasInGames = games.some((g: any) => {
        const pA = String(g?.playerA?.ign || g?.playerA?.name || "").toLowerCase();
        const pB = String(g?.playerB?.ign || g?.playerB?.name || "").toLowerCase();
        return pA.includes(cleanQuery) || pB.includes(cleanQuery);
      });
      if (hasInGames) return true;
    }

    return false;
  }

  return true;
}
