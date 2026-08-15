"use client";

import { useEffect, useState, useMemo } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";
import {
  X,
  Trophy,
  Swords,
  Users,
  Loader2,
  Crown,
  Activity,
  CreditCard,
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
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  // Kunci scroll background saat modal aktif
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Fetch roster resmi on-demand
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/tournament/team-roster?teamName=${encodeURIComponent(team.teamName)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setRoster(json.data.players || []);
        }
      })
      .catch((err) => console.error("Gagal load roster:", err))
      .finally(() => {
        if (isMounted) setLoadingRoster(false);
      });

    return () => {
      isMounted = false;
    };
  }, [team.teamName]);

  // Ekstraksi riwayat pertandingan & jadwal berikutnya secara team-centric
  const { history, nextMatch, formStreak } = useMemo(() => {
    const currentName = team.teamName.toLowerCase();
    const teamMatches = allSchedules.filter(
      (m) =>
        m.teamAName.toLowerCase() === currentName ||
        m.teamBName.toLowerCase() === currentName
    );

    const historyItems = teamMatches
      .filter((m) => m.isFinished)
      .sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
      .map((m) => {
        const isTeamA = m.teamAName.toLowerCase() === currentName;
        const myScore = isTeamA ? m.scoreA || 0 : m.scoreB || 0;
        const oppScore = isTeamA ? m.scoreB || 0 : m.scoreA || 0;
        const oppName = isTeamA ? m.teamBName : m.teamAName;
        const oppLogo = isTeamA ? m.teamBLogo : m.teamALogo;
        const isWin = myScore > oppScore;

        return {
          id: m.id,
          weekNumber: m.weekNumber,
          isWin,
          myScore,
          oppScore,
          oppName,
          oppLogo,
        };
      });

    const next = teamMatches
      .filter((m) => !m.isFinished)
      .sort(
        (a, b) =>
          new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      )[0];

    const forms = [...historyItems]
      .slice(0, 5)
      .reverse()
      .map((h) => (h.isWin ? "W" : "L"));

    return { history: historyItems, nextMatch: next, formStreak: forms };
  }, [team.teamName, allSchedules]);

  const totalMatches = (team.matchWins || 0) + (team.matchLosses || 0);
  const winRate =
    totalMatches > 0 ? Math.round(((team.matchWins || 0) / totalMatches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-3xl border border-border/70 bg-slate-950 text-foreground shadow-2xl overflow-hidden">
        
        {/* HEADER PROFIL */}
        <div className="flex items-center justify-between border-b border-border/40 bg-slate-900/90 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/40 p-1.5 flex items-center justify-center shadow-inner">
              <img
                src={team.teamLogo || "/logo.webp"}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate text-foreground tracking-tight">
                {team.teamName}
              </h2>
              <p className="text-[10.5px] font-semibold text-primary">
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

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* 1. KARTU STATISTIK & VISUAL PROGRESS */}
          <div className="space-y-2 rounded-2xl border border-border/50 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground uppercase tracking-wider text-[9.5px]">
                <Activity className="h-3.5 w-3.5 text-primary" /> Performa Tim
              </span>
              <div className="flex items-center gap-1">
                {formStreak.length > 0 ? (
                  formStreak.map((f, i) => (
                    <span
                      key={i}
                      className={`flex h-4 w-4 items-center justify-center rounded-sm text-[8.5px] font-black ${
                        f === "W"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-[9.5px] text-muted-foreground">0 Match</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="rounded-xl bg-primary/10 border border-primary/20 py-2">
                <span className="block text-[8.5px] font-bold text-muted-foreground">POIN</span>
                <span className="text-sm font-black text-primary">{team.points}</span>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/40 py-2">
                <span className="block text-[8.5px] font-bold text-muted-foreground">MATCH</span>
                <span className="text-xs font-black">{team.matchWins}W - {team.matchLosses}L</span>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/40 py-2">
                <span className="block text-[8.5px] font-bold text-muted-foreground">SELISIH (RD)</span>
                <span className={`text-xs font-black ${team.roundDifference > 0 ? "text-emerald-400" : team.roundDifference < 0 ? "text-rose-400" : ""}`}>
                  {team.roundDifference > 0 ? `+${team.roundDifference}` : team.roundDifference}
                </span>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/40 py-2">
                <span className="block text-[8.5px] font-bold text-muted-foreground">WIN RATE</span>
                <span className="text-xs font-black text-amber-400">{winRate}%</span>
              </div>
            </div>

            {/* Minimalist Win Rate Bar */}
            <div className="pt-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-500/30 flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. LAGA BERIKUTNYA */}
          {nextMatch && (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3">
              <span className="text-[9.5px] font-black uppercase text-sky-400 block mb-2 flex items-center gap-1.5">
                <Swords className="h-3 w-3" /> Laga Mendatang (Week {nextMatch.weekNumber})
              </span>
              <div className="flex items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-sky-500/20">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img
                    src={nextMatch.teamALogo || "/logo.webp"}
                    alt=""
                    className="h-5 w-5 object-contain shrink-0"
                  />
                  <span className="font-bold text-[11px] truncate text-foreground">
                    {nextMatch.teamAName}
                  </span>
                </div>
                <span className="text-[9.5px] font-black px-2 py-0.5 rounded bg-muted text-sky-400 shrink-0">
                  VS
                </span>
                <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                  <span className="font-bold text-[11px] truncate text-right text-foreground">
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

          {/* 3. RIWAYAT PERTANDINGAN (TEAM-CENTRIC SCORE) */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Riwayat Pertandingan
            </span>
            {history.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {history.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-slate-900/60 px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[8.5px] font-black shrink-0 ${
                          m.isWin
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {m.isWin ? "WIN" : "LOSE"}
                      </span>
                      <span className="text-[9.5px] font-bold text-muted-foreground shrink-0">
                        W{m.weekNumber}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <img
                          src={m.oppLogo || "/logo.webp"}
                          alt=""
                          className="h-4 w-4 object-contain shrink-0"
                        />
                        <span className="truncate font-semibold text-foreground">
                          vs {m.oppName}
                        </span>
                      </div>
                    </div>

                    {/* Skor Berorientasi Tim Ini */}
                    <div className="font-black text-xs shrink-0 ml-2">
                      <span className={m.isWin ? "text-emerald-400" : "text-foreground"}>
                        {m.myScore}
                      </span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className={!m.isWin ? "text-rose-400" : "text-foreground"}>
                        {m.oppScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-border/30 bg-muted/10 p-3 text-center text-[10.5px] text-muted-foreground">
                Belum ada pertandingan yang selesai.
              </p>
            )}
          </div>

          {/* 4. SKUAD / ROSTER RESMI (IGN & DL ID ONLY) */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
              <Users className="h-3 w-3 text-primary" /> Roster Anggota
            </span>

            {loadingRoster ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Memuat data pemain...
              </div>
            ) : roster.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {roster.map((p, idx) => {
                  const isLeader = p.role === "Ketua" || p.role === "Kapten";
                  const isCoLeader = p.role === "Wakil Ketua";
                  const ign = p.ign || p.playerName || p.namaLengkap;
                  const dlId = p.idDuelLinks || p.duelId;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border/40 bg-slate-900/60 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                        {isLeader ? (
                          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        ) : isCoLeader ? (
                          <Crown className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        ) : (
                          <span className="text-[9px] font-bold text-muted-foreground shrink-0 w-3 text-center">
                            {idx + 1}
                          </span>
                        )}
                        <span className="font-bold text-[11px] truncate text-foreground tracking-tight">
                          {ign}
                        </span>
                      </div>

                      {dlId ? (
                        <div className="flex items-center gap-1 rounded bg-slate-950 border border-border/40 px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground shrink-0">
                          <CreditCard className="h-2.5 w-2.5 text-primary" />
                          <span>{dlId}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground font-mono shrink-0">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3 text-center text-[10.5px] text-muted-foreground">
                Roster belum terdaftar di database.
              </p>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t border-border/40 bg-slate-900/90 p-3">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
          >
            Tutup Profil Tim
          </button>
        </div>

      </div>
    </div>
  );
                      }
