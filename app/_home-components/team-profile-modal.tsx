"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";
import {
  X,
  Trophy,
  Activity,
  Flame,
  Swords,
  Users,
  Layers,
  Wrench,
} from "lucide-react";

interface TeamProfileModalProps {
  team: any;
  allSchedules: MatchScheduleItem[];
  onClose: () => void;
}

export function TeamProfileModal({
  team,
  allSchedules,
  onClose,
}: TeamProfileModalProps) {
  // 1. Ekstraksi riwayat pertandingan tim & form streak
  const { matchHistory, nextMatch, formStreak } = useMemo(() => {
    const teamNameLower = team.teamName.toLowerCase();

    // Ambil semua match yang melibatkan tim ini
    const teamMatches = allSchedules.filter(
      (m) =>
        m.teamAName.toLowerCase() === teamNameLower ||
        m.teamBName.toLowerCase() === teamNameLower
    );

    // Riwayat match yang sudah selesai
    const history = teamMatches
      .filter((m) => m.isFinished)
      .sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
      .map((m) => {
        const isTeamA = m.teamAName.toLowerCase() === teamNameLower;
        const myScore = isTeamA ? m.scoreA || 0 : m.scoreB || 0;
        const oppScore = isTeamA ? m.scoreB || 0 : m.scoreA || 0;
        const opponentName = isTeamA ? m.teamBName : m.teamAName;
        const opponentLogo = isTeamA ? m.teamBLogo : m.teamALogo;
        const isWin = myScore > oppScore;

        return {
          id: m.id,
          weekNumber: m.weekNumber,
          isWin,
          myScore,
          oppScore,
          opponentName,
          opponentLogo,
        };
      });

    // Jadwal pertandingan berikutnya yang belum selesai
    const next = teamMatches
      .filter((m) => !m.isFinished)
      .sort(
        (a, b) =>
          new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      )[0];

    // Recent Form (5 match terakhir, urutan kronologis)
    const forms = [...history].slice(0, 5).reverse().map((h) => (h.isWin ? "W" : "L"));

    return {
      matchHistory: history,
      nextMatch: next,
      formStreak: forms,
    };
  }, [team, allSchedules]);

  const totalMatches = (team.matchWins || 0) + (team.matchLosses || 0);
  const winRate =
    totalMatches > 0
      ? Math.round(((team.matchWins || 0) / totalMatches) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border/80 bg-slate-950 text-foreground shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-border/50 bg-slate-900/80 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-primary/30 bg-muted/40 p-1">
              <img
                src={team.teamLogo || "/logo.webp"}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate text-foreground">
                {team.teamName}
              </h2>
              <p className="text-[11px] font-semibold text-primary">
                {team.groupName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* 1. STATISTIK UTAMA */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
              <Activity className="h-3 w-3 text-primary" /> Statistik Performa
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-center">
                <span className="block text-[9px] font-bold text-muted-foreground">POINTS</span>
                <span className="text-sm sm:text-base font-black text-primary">{team.points}</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                <span className="block text-[9px] font-bold text-muted-foreground">MATCH (W-L)</span>
                <span className="text-xs sm:text-sm font-black text-foreground">{team.matchWins}-{team.matchLosses}</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                <span className="block text-[9px] font-bold text-muted-foreground">ROUND DIFF</span>
                <span className={`text-xs sm:text-sm font-black ${team.roundDifference > 0 ? "text-emerald-400" : team.roundDifference < 0 ? "text-rose-400" : "text-foreground"}`}>
                  {team.roundDifference > 0 ? `+${team.roundDifference}` : team.roundDifference}
                </span>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                <span className="block text-[9px] font-bold text-muted-foreground">WIN RATE</span>
                <span className="text-xs sm:text-sm font-black text-amber-400">{winRate}%</span>
              </div>
            </div>
          </div>

          {/* 2. RECENT FORM STREAK */}
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2.5">
            <span className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" /> Recent Form:
            </span>
            <div className="flex items-center gap-1.5">
              {formStreak.length > 0 ? (
                formStreak.map((res, i) => (
                  <span
                    key={i}
                    className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
                      res === "W"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                  >
                    {res}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">Belum ada match</span>
              )}
            </div>
          </div>

          {/* 3. JADWAL LAGA BERIKUTNYA */}
          {nextMatch && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <Swords className="h-3 w-3 text-sky-400" /> Laga Berikutnya
              </span>
              <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img
                    src={nextMatch.teamALogo || "/logo.webp"}
                    alt=""
                    className="h-5 w-5 object-contain shrink-0"
                  />
                  <span className="text-[11px] font-bold truncate text-foreground">
                    {nextMatch.teamAName}
                  </span>
                </div>
                <span className="px-2 text-[10px] font-black text-sky-400 shrink-0">VS</span>
                <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                  <span className="text-[11px] font-bold truncate text-right text-foreground">
                    {nextMatch.teamBName}
                  </span>
                  <img
                    src={nextMatch.teamBLogo || "/logo.webp"}
                    alt=""
                    className="h-5 w-5 object-contain shrink-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. RIWAYAT PERTANDINGAN (MATCH HISTORY) */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
              <Trophy className="h-3 w-3 text-amber-500" /> Riwayat Pertandingan
            </span>
            {matchHistory.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {matchHistory.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                          m.isWin
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {m.isWin ? "WIN" : "LOSE"}
                      </span>
                      <span className="text-muted-foreground text-[10px]">W{m.weekNumber}</span>
                      <span className="truncate text-foreground font-semibold">
                        vs {m.opponentName}
                      </span>
                    </div>
                    <span className="font-black text-foreground shrink-0 ml-2">
                      {m.myScore} - {m.oppScore}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-border/30 bg-muted/10 p-3 text-center text-[10.5px] text-muted-foreground">
                Belum ada data riwayat pertandingan.
              </p>
            )}
          </div>

          {/* 5. DECK ARCHETYPES & ROSTER (STATUS MAINTENANCE / UNDER DEVELOPMENT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-[10.5px]">
                <Layers className="h-3.5 w-3.5" /> Deck Archetypes
              </div>
              <p className="text-[9.5px] text-muted-foreground flex items-center justify-center gap-1">
                <Wrench className="h-2.5 w-2.5" /> Integrasi Report Match
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-sky-400 font-bold text-[10.5px]">
                <Users className="h-3.5 w-3.5" /> Skuad & Roster Resmi
              </div>
              <p className="text-[9.5px] text-muted-foreground flex items-center justify-center gap-1">
                <Wrench className="h-2.5 w-2.5" /> Menunggu Sinkronisasi
              </p>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="border-t border-border/50 bg-slate-900/80 p-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
          >
            Tutup Profil Tim
          </button>
        </div>
      </div>
    </div>
  );
              }
