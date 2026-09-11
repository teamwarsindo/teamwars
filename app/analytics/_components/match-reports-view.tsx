"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReportFilter, ReportFilterMatchItem } from "./report-filter";
import { ReportScoreboard } from "./report-scoreboard";
import { ReportLineup } from "./report-lineup";
import { ReportLogs } from "./report-logs";

export interface ScheduleItem extends ReportFilterMatchItem {
  matchDate?: string;
  isFinished?: boolean;
}

export function MatchReportsView({ schedules = [] }: { schedules: ScheduleItem[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchParam = searchParams.get("match") || "";

  // 1. Ekstraksi daftar week aktif yang tersedia
  const availableWeeks = useMemo(() => {
    if (!schedules.length) return [];
    return Array.from(new Set(schedules.map((s) => Number(s.weekNumber || 1)))).sort((a, b) => a - b);
  }, [schedules]);

  // 2. Evaluasi match awal jika dipanggil via parameter query
  const initialMatch = useMemo(() => {
    return matchParam && schedules.length ? schedules.find((s) => s.id === matchParam) || null : null;
  }, [schedules, matchParam]);

  // Proteksi pekan depan / match ilegal: sembunyikan jika match tidak ada di jadwal aktif
  const isRequestedMatchForbidden = Boolean(matchParam) && !initialMatch;

  const [selectedWeek, setSelectedWeek] = useState<number | "">(initialMatch ? initialMatch.weekNumber : "");
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatch ? initialMatch.id : "");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const matchesInView = useMemo(() => {
    if (!selectedWeek || !schedules.length) return [];
    return schedules.filter((s) => Number(s.weekNumber || 1) === Number(selectedWeek));
  }, [schedules, selectedWeek]);

  const activeSchedule = useMemo(() => schedules.find((s) => s.id === selectedMatchId), [schedules, selectedMatchId]);

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  const handleMatchChange = useCallback((newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", newMatchId);
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleReset = () => {
    setSelectedWeek("");
    setSelectedMatchId("");
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  // 3. Fetch Laporan Duel dari Endpoint API Analytics Baru
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

    // Polling auto-update tiap 5 detik jika duel masih berlangsung
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

  // Render Fallback jika mencoba membuka match pekan depan yang belum resmi
  if (isRequestedMatchForbidden) {
    return (
      <div className="w-full space-y-4">
        <ReportFilter
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          availableWeeks={availableWeeks}
          selectedMatchId=""
          onMatchChange={handleMatchChange}
          matchesInView={matchesInView}
          isFilterActive={Boolean(selectedWeek || selectedMatchId)}
          onReset={handleReset}
        />
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs space-y-2">
          <div className="font-bold text-foreground text-sm">Pertandingan Belum Tersedia</div>
          <p className="text-[11px] max-w-sm mx-auto">
            Jadwal untuk pertandingan ini belum dibuka atau belum memasuki pekan pertandingan resmi.
          </p>
        </div>
      </div>
    );
  }

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];
  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10);

  // Lineup Reveal: buka hanya yang sudah bertanding saat live, buka penuh saat match selesai
  const lineupA = (teamA.lineup || []).map((p: any) => {
    if (isFinished) return p;
    const played = new Set(games.map((g) => g.playerA?.ign));
    return played.has(p?.ign) ? p : null;
  });

  const lineupB = (teamB.lineup || []).map((p: any) => {
    if (isFinished) return p;
    const played = new Set(games.map((g) => g.playerB?.ign));
    return played.has(p?.ign) ? p : null;
  });

  // Perhitungan MVP Match setelah selesai
  const mvpData = useMemo(() => {
    if (!isFinished || !games.length) return null;
    const winsMap: Record<string, { ign: string; wins: number; team: string }> = {};
    games.forEach((g) => {
      const isWinnerA = g.winner === "teamA";
      const p = isWinnerA ? g.playerA : g.playerB;
      const team = isWinnerA ? teamA.name : teamB.name;
      if (p?.ign) {
        if (!winsMap[p.ign]) winsMap[p.ign] = { ign: p.ign, wins: 0, team };
        winsMap[p.ign].wins += 1;
      }
    });
    return Object.values(winsMap).sort((a, b) => b.wins - a.wins)[0] || null;
  }, [isFinished, games, teamA.name, teamB.name]);

  // Petunjuk Giliran Berikutnya saat status Live
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

  const matchDisplayDate = useMemo(() => {
    const raw = meta.date || activeSchedule?.matchDate;
    if (!raw) return "-";
    try {
      return new Date(raw).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return raw;
    }
  }, [meta.date, activeSchedule?.matchDate]);

  return (
    <div className="w-full space-y-4">
      {/* Kontrol Filter Dropdown */}
      <ReportFilter
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        availableWeeks={availableWeeks}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={Boolean(selectedWeek || selectedMatchId)}
        onReset={handleReset}
      />

      {!selectedMatchId ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
          Silakan pilih <strong>Week</strong> dan <strong>Pertandingan</strong> di atas untuk memuat laporan duel.
        </div>
      ) : loading && !report ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          Memuat laporan pertandingan...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border space-y-1.5">
          <div className="font-bold text-foreground">Pertandingan Belum Dimulai</div>
          <p className="text-[11px] max-w-md mx-auto">
            Wasit belum menginput data duel untuk pertandingan ini. Laporan akan diperbarui secara real-time saat duel berlangsung.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Metadata Laporan */}
          <div className="bg-card border border-border p-3.5 rounded-2xl shadow-xs space-y-1 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-black tracking-wide uppercase text-foreground">
                {isFinished ? "OFFICIAL MATCH REPORT" : "LIVE MATCH REPORT"} — WEEK {selectedWeek || report.week}
              </span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {activeSchedule?.groupName || "Stage Group"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
              <div>• <strong>Match:</strong> {teamA.name} vs {teamB.name}</div>
              <div>• <strong>Jadwal:</strong> {matchDisplayDate}</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span>• <strong>Referee:</strong> {meta.referee || "-"}</span>
                <span>• <strong>Streamer:</strong> {meta.streamer || "-"}</span>
                {meta.streamUrl && (
                  <a href={meta.streamUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">
                    Tonton Siaran ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Scoreboard (Papan Skor Melayang) */}
          <ReportScoreboard
            teamA={teamA}
            teamB={teamB}
            scoreA={scoreA}
            scoreB={scoreB}
            teamALogo={activeSchedule?.teamALogo}
            teamBLogo={activeSchedule?.teamBLogo}
          />

          {/* Lineup 50:50 Kiri - Kanan Tanpa Judul */}
          <ReportLineup lineupA={lineupA} lineupB={lineupB} />

          {/* Logs Rapat ke Tengah & Summary Dinamis */}
          <ReportLogs
            games={games}
            isFinished={isFinished}
            scoreA={scoreA}
            scoreB={scoreB}
            teamAName={teamA.name}
            teamBName={teamB.name}
            mvpData={mvpData}
            liveInstruction={liveInstruction}
          />
        </div>
      )}
    </div>
  );
                                 }
