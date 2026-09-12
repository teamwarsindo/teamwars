"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReportFilter, ReportFilterMatchItem } from "./report-filter";
import { ReportScoreboard } from "./report-scoreboard";
import { ReportLineup } from "./report-lineup";
import { ReportLogs } from "./report-logs";
import { ReportSummary } from "./report-summary";

export interface ScheduleItem extends ReportFilterMatchItem {
  matchDate?: string;
  isFinished?: boolean;
  matchNumber?: number | string;
  teamALogo?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
}

export function MatchReportsView({ schedules = [] }: { schedules: ScheduleItem[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  // Pekan aktif tertinggi (berdasarkan match selesai)
  const maxActiveWeek = useMemo(() => {
    return schedules.reduce((max, s) => {
      const w = Number(s.weekNumber || 1);
      return s.isFinished && w > max ? w : max;
    }, 1);
  }, [schedules]);

  // Dibatasi maksimal pekan aktif tertinggi
  const validSchedules = useMemo(() => {
    return schedules.filter((s) => Number(s.weekNumber || 1) <= maxActiveWeek);
  }, [schedules, maxActiveWeek]);

  const availableWeeks = useMemo(() => {
    if (!validSchedules.length) return [];
    return Array.from(new Set(validSchedules.map((s) => Number(s.weekNumber || 1)))).sort((a, b) => a - b);
  }, [validSchedules]);

  const initialMatch = useMemo(() => {
    return matchParam && validSchedules.length ? validSchedules.find((s) => s.id === matchParam) || null : null;
  }, [validSchedules, matchParam]);

  // Default week: netral "" (-- Semua Week --) seperti Tim
  const [selectedWeek, setSelectedWeek] = useState<number | "">(
    initialMatch ? Number(initialMatch.weekNumber) : ""
  );
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatch ? initialMatch.id : "");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    validSchedules.forEach((s) => {
      if (s.teamAName) teams.add(s.teamAName);
      if (s.teamBName) teams.add(s.teamBName);
    });
    return Array.from(teams).sort();
  }, [validSchedules]);

  const matchesInView = useMemo(() => {
    return validSchedules.filter((s) => {
      const matchWeek = selectedWeek === "" || Number(s.weekNumber || 1) === Number(selectedWeek);
      const matchTeam =
        selectedTeam === "" ||
        s.teamAName?.toLowerCase() === selectedTeam.toLowerCase() ||
        s.teamBName?.toLowerCase() === selectedTeam.toLowerCase();
      return matchWeek && matchTeam;
    });
  }, [validSchedules, selectedWeek, selectedTeam]);

  // Auto-select jika hasil filter tinggal 1 match
  useEffect(() => {
    if (matchesInView.length === 1 && matchesInView[0].id !== selectedMatchId) {
      handleMatchChange(matchesInView[0].id);
    }
  }, [matchesInView, selectedMatchId]);

  const activeSchedule = useMemo(
    () => validSchedules.find((s) => s.id === selectedMatchId),
    [validSchedules, selectedMatchId]
  );

  const handleWeekChange = (week: number | "") => {
    setSelectedWeek(week);
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const handleTeamChange = (team: string) => {
    setSelectedTeam(team);
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const handleMatchChange = useCallback(
    (newMatchId: string) => {
      setSelectedMatchId(newMatchId);
      const matched = validSchedules.find((s) => s.id === newMatchId);
      if (matched && selectedWeek === "") {
        setSelectedWeek(Number(matched.weekNumber));
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "reports");
      params.set("match", newMatchId);
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, validSchedules, selectedWeek]
  );

  const handleReset = () => {
    setSelectedWeek("");
    setSelectedTeam("");
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!selectedMatchId) {
      setReport(null);
      return;
    }

    let isSubscribed = true;

    const fetchReport = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await fetch(`/api/analytics/match-report?matchId=${selectedMatchId}`);
        const json = await res.json();
        if (json.success && json.data && isSubscribed) {
          setReport(json.data);
        } else if (!json.success && isSubscribed) {
          setReport(null);
        }
      } catch (err) {
        console.error("Gagal load match report:", err);
      } finally {
        if (!isSilent && isSubscribed) setLoading(false);
      }
    };

    fetchReport();

    const interval = setInterval(() => {
      if (report && !report.isFinished) {
        fetchReport(true);
      }
    }, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedMatchId, report?.isFinished]);

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];
  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? activeSchedule?.scoreA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? activeSchedule?.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);

  const scheduleDateInfo = useMemo(() => {
    const raw = activeSchedule?.matchDate;
    if (!raw) return { day: "-", date: "-", time: "-" };
    try {
      const d = new Date(raw);
      const day = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(d);
      const date = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
      const timeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(d);
      return { day, date, time: `${timeStr.replace(":", ".")} WIB` };
    } catch {
      return { day: "-", date: raw, time: "-" };
    }
  }, [activeSchedule?.matchDate]);

  const resolvedMatchNumber = useMemo(() => {
    if (activeSchedule?.matchNumber) return activeSchedule.matchNumber;
    if (selectedMatchId) {
      const extracted = selectedMatchId.replace(/\D/g, "");
      if (extracted) return extracted;
    }
    return 1;
  }, [activeSchedule?.matchNumber, selectedMatchId]);

  const liveInstruction = useMemo(() => {
    if (isFinished || !games.length) return null;
    const last = games[games.length - 1];
    const isWinnerA = last.winner === "teamA";
    return {
      nextGameNumber: games.length + 1,
      stayTable: (isWinnerA ? last.playerA?.ign : last.playerB?.ign) || "Pemenang Ronde Sebelumnya",
      nextActionTeam: (isWinnerA ? teamB.name : teamA.name) || "Kubu Lawan",
    };
  }, [isFinished, games, teamA.name, teamB.name]);

  const isFilterActive = Boolean(selectedWeek !== "" || selectedTeam || selectedMatchId);

  return (
    <div className="w-full space-y-4">
      <ReportFilter
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        availableWeeks={availableWeeks}
        selectedTeam={selectedTeam}
        onTeamChange={handleTeamChange}
        availableTeams={availableTeams}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {!selectedMatchId ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
          Silakan pilih pertandingan di atas untuk memuat laporan duel.
        </div>
      ) : loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          Memuat laporan pertandingan...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border space-y-1.5">
          <div className="font-bold text-foreground">Pertandingan Belum Dimulai</div>
          <p className="text-[11px] max-w-md mx-auto">
            Wasit belum menginput data duel untuk pertandingan ini.
          </p>
        </div>
      ) : (
        <>
          <ReportScoreboard
            teamA={teamA}
            teamB={teamB}
            scoreA={scoreA}
            scoreB={scoreB}
            teamALogo={activeSchedule?.teamALogo}
            teamBLogo={activeSchedule?.teamBLogo}
            metadata={{
              matchNumber: resolvedMatchNumber,
              division: activeSchedule?.groupName || meta.division,
              week: activeSchedule?.weekNumber || selectedWeek || report.week,
              day: scheduleDateInfo.day,
              date: scheduleDateInfo.date,
              time: scheduleDateInfo.time,
              referee: meta.referee,
              streamer: meta.streamer,
              streamUrl: meta.streamUrl,
            }}
          />

          <ReportLineup
            lineupA={teamA.lineup || []}
            lineupB={teamB.lineup || []}
            games={games}
            isFinished={isFinished}
          />

          <ReportLogs games={games} />

          <ReportSummary
            games={games}
            isFinished={isFinished}
            scoreA={scoreA}
            scoreB={scoreB}
            liveInstruction={liveInstruction}
          />
        </>
      )}
    </div>
  );
}
