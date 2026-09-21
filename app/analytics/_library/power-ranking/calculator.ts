import {
  RawMatchReport,
  TeamRosterData,
  PowerRankingPlayer,
  PowerRankingGrandTotal,
  LineupPlayer,
} from "./types";
import { normalizeKey, calculateBestDeck } from "./utils";

interface PlayerStatAccumulator {
  name: string;
  teamSlug: string;
  teamName: string;
  teamLogo?: string;
  groupName?: string;
  won: number;
  lost: number;
  matchesAppeared: Set<string>;
  deckStats: Map<string, { wins: number; losses: number }>;
}

export function calculatePowerRanking({
  reports,
  targetWeek,
  teams = [],
  filterScope = "GLOBAL",
  selectedTeamSlug,
}: {
  reports: RawMatchReport[];
  targetWeek: number;
  teams?: TeamRosterData[];
  filterScope: "GLOBAL" | "Anda Yakin?" | "Sakurasawa Fighters" | "TEAM";
  selectedTeamSlug?: string;
}): {
  players: PowerRankingPlayer[];
  grandTotal?: PowerRankingGrandTotal;
} {
  const validReports = reports.filter((r) => Number(r.week || 1) <= targetWeek);
  const playerStatsMap = new Map<string, PlayerStatAccumulator>();

  const getOrCreateStat = (
    normSlug: string,
    ign: string,
    slug: string,
    teamName: string,
    logo?: string,
    group?: string
  ) => {
    const key = `${normSlug}:${normalizeKey(ign)}`;
    if (!playerStatsMap.has(key)) {
      playerStatsMap.set(key, {
        name: ign.trim(),
        teamSlug: slug,
        teamName,
        teamLogo: logo,
        groupName: group,
        won: 0,
        lost: 0,
        matchesAppeared: new Set(),
        deckStats: new Map(),
      });
    }
    return playerStatsMap.get(key)!;
  };

  for (const rep of validReports) {
    const reportId =
      rep.matchId || rep.id || `${rep.week}-${rep.teamA.name}-vs-${rep.teamB.name}`;
    const slugA = rep.teamA.slug || rep.teamA.name;
    const slugB = rep.teamB.slug || rep.teamB.name;
    const normSlugA = normalizeKey(slugA);
    const normSlugB = normalizeKey(slugB);

    if (Array.isArray(rep.games) && rep.games.length > 0) {
      for (const g of rep.games) {
        const pAName = g.playerA?.ign?.trim();
        const pBName = g.playerB?.ign?.trim();
        if (!pAName || !pBName) continue;

        const statA = getOrCreateStat(normSlugA, pAName, slugA, rep.teamA.name, rep.teamA.logo, rep.teamA.groupName);
        const statB = getOrCreateStat(normSlugB, pBName, slugB, rep.teamB.name, rep.teamB.logo, rep.teamB.groupName);

        statA.matchesAppeared.add(reportId);
        statB.matchesAppeared.add(reportId);

        const w = (g.winner || "").toLowerCase().trim();
        const winA = w === "teama" || w === pAName.toLowerCase() || w === normalizeKey(rep.teamA.name);
        const winB = w === "teamb" || w === pBName.toLowerCase() || w === normalizeKey(rep.teamB.name);

        const deckA = g.playerA?.archetype?.trim();
        const deckB = g.playerB?.archetype?.trim();

        if (deckA && !statA.deckStats.has(deckA)) statA.deckStats.set(deckA, { wins: 0, losses: 0 });
        if (deckB && !statB.deckStats.has(deckB)) statB.deckStats.set(deckB, { wins: 0, losses: 0 });

        if (winA) {
          statA.won += 1;
          statB.lost += 1;
          if (deckA) statA.deckStats.get(deckA)!.wins += 1;
          if (deckB) statB.deckStats.get(deckB)!.losses += 1;
        } else if (winB) {
          statB.won += 1;
          statA.lost += 1;
          if (deckB) statB.deckStats.get(deckB)!.wins += 1;
          if (deckA) statA.deckStats.get(deckA)!.losses += 1;
        }
      }
    } else {
      const processLineup = (lineup: LineupPlayer[] = [], slug: string, normSlug: string, tName: string, logo?: string, group?: string) => {
        for (const p of lineup) {
          if (!p.ign) continue;
          const wins = Number(p.totalWins || 0);
          const losses = Number(p.totalLosses || 0);
          if (wins === 0 && losses === 0) continue;

          const stat = getOrCreateStat(normSlug, p.ign, slug, tName, logo, group);
          stat.won += wins;
          stat.lost += losses;
          stat.matchesAppeared.add(reportId);

          if (p.deck1?.archetype) {
            const arch = p.deck1.archetype.trim();
            if (!stat.deckStats.has(arch)) stat.deckStats.set(arch, { wins: 0, losses: 0 });
            stat.deckStats.get(arch)!.wins += Number(p.deck1.wins || 0);
            stat.deckStats.get(arch)!.losses += Number(p.deck1.losses || 0);
          }
          if (p.deck2?.archetype) {
            const arch = p.deck2.archetype.trim();
            if (!stat.deckStats.has(arch)) stat.deckStats.set(arch, { wins: 0, losses: 0 });
            stat.deckStats.get(arch)!.wins += Number(p.deck2.wins || 0);
            stat.deckStats.get(arch)!.losses += Number(p.deck2.losses || 0);
          }
        }
      };

      processLineup(rep.teamA.lineup, slugA, normSlugA, rep.teamA.name, rep.teamA.logo, rep.teamA.groupName);
      processLineup(rep.teamB.lineup, slugB, normSlugB, rep.teamB.name, rep.teamB.logo, rep.teamB.groupName);
    }
  }

  let playerList: PowerRankingPlayer[] = Array.from(playerStatsMap.values()).map((p) => {
    const played = p.matchesAppeared.size;
    const won = p.won;
    const lost = p.lost;
    return {
      rank: 0,
      name: p.name,
      teamSlug: p.teamSlug,
      teamName: p.teamName,
      teamLogo: p.teamLogo,
      groupName: p.groupName,
      played,
      won,
      lost,
      wpm: played > 0 ? Number((won / played).toFixed(2)) : 0,
      agg: won - lost,
      bestDeck: calculateBestDeck(p.deckStats),
    };
  });

  let grandTotal: PowerRankingGrandTotal | undefined;

  if (filterScope === "TEAM" && selectedTeamSlug) {
    const targetNorm = normalizeKey(selectedTeamSlug);
    const selectedTeam = teams.find(
      (t) => normalizeKey(t.slug) === targetNorm || normalizeKey(t.name) === targetNorm
    );

    const rawRoster = selectedTeam?.players || selectedTeam?.members || [];
    const activeMemberMap = new Map<string, { ign: string; isAdded: boolean }>();

    for (const item of rawRoster) {
      const ign = typeof item === "string" ? item : item.ign || item.name || "";
      if (!ign) continue;
      const count = typeof item === "object" ? Number(item.teamsJoinedCount || 0) : 0;
      const addedFlag = typeof item === "object" ? Boolean(item.isAdded || item.isTransfer) : false;
      activeMemberMap.set(normalizeKey(ign), { ign, isAdded: addedFlag || count >= 1 });
    }

    const teamReportPlayers = playerList.filter(
      (p) => normalizeKey(p.teamSlug) === targetNorm || normalizeKey(p.teamName) === targetNorm
    );
    const recordedMemberKeys = new Set<string>();

    const processedTeamPlayers: PowerRankingPlayer[] = teamReportPlayers.map((p) => {
      const normPName = normalizeKey(p.name);
      const memberInfo = activeMemberMap.get(normPName);
      const isEx = activeMemberMap.size > 0 && !memberInfo;
      const isAdd = !isEx && Boolean(memberInfo?.isAdded);
      recordedMemberKeys.add(normPName);

      return { ...p, isExPlayer: isEx, isAdded: isAdd };
    });

    for (const [normM, memberInfo] of Array.from(activeMemberMap.entries())) {
      if (!recordedMemberKeys.has(normM)) {
        processedTeamPlayers.push({
          rank: 0,
          name: memberInfo.ign.trim(),
          teamSlug: selectedTeam?.slug || selectedTeamSlug,
          teamName: selectedTeam?.name || selectedTeamSlug,
          teamLogo: selectedTeam?.logo,
          groupName: selectedTeam?.groupName,
          played: 0,
          won: 0,
          lost: 0,
          wpm: 0,
          agg: 0,
          isExPlayer: false,
          isAdded: memberInfo.isAdded,
          bestDeck: "-",
        });
      }
    }

    playerList = processedTeamPlayers;

    const totalWon = playerList.reduce((acc, cur) => acc + cur.won, 0);
    const totalLost = playerList.reduce((acc, cur) => acc + cur.lost, 0);
    const totalPlayed = playerList.reduce((acc, cur) => acc + cur.played, 0);

    grandTotal = {
      played: totalPlayed,
      won: totalWon,
      lost: totalLost,
      wpm: totalPlayed > 0 ? Number((totalWon / totalPlayed).toFixed(2)) : 0,
      agg: totalWon - totalLost,
    };
  } else {
    playerList = playerList.filter((p) => p.played >= 1);
    if (filterScope === "Anda Yakin?" || filterScope === "Sakurasawa Fighters") {
      playerList = playerList.filter((p) => p.groupName === filterScope);
    }
  }

  playerList.sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.agg !== a.agg) return b.agg - a.agg;
    return a.played - b.played;
  });

  playerList = playerList.map((p, idx) => ({ ...p, rank: idx + 1 }));

  return { players: playerList, grandTotal };
      }
