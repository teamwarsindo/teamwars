"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExternalLink, Crown, Shield, X, Radio } from "lucide-react";

interface MatchReportModalProps {
  open?: boolean;
  match: MatchScheduleItem | null;
  weekNumber?: number;
  onClose: () => void;
}

export function MatchReportModal({
  open,
  match,
  weekNumber,
  onClose,
}: MatchReportModalProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (match || open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [match, open]);

  useEffect(() => {
    if (!open && !match) {
      setReport(null);
      return;
    }

    const fetchReport = async () => {
      if (!match?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/match-report?matchId=${match.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setReport(json.data);
        } else {
          setReport(null);
        }
      } catch (err) {
        console.error("Gagal memuat report analytics:", err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [match?.id, open]);

  const meta = report?.metadata || {};
  const teamA = report?.teamA || {};
  const teamB = report?.teamB || {};
  const games: any[] = report?.games || [];

  const scoreA = teamA.score ?? report?.finalScore?.teamA ?? match?.scoreA ?? 0;
  const scoreB = teamB.score ?? report?.finalScore?.teamB ?? match?.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10 || match?.isFinished);

  const teamAName = teamA.name || match?.teamAName || "Tim A";
  const teamBName = teamB.name || match?.teamBName || "Tim B";
  const teamALogo = match?.teamALogo;
  const teamBLogo = match?.teamBLogo;

  const lineupA: any[] = teamA.lineup || [];
  const lineupB: any[] = teamB.lineup || [];

  const topDuelist = useMemo(() => {
    if (!games.length) return null;
    const playerWins = new Map<string, { ign: string; team: string; wins: number; archetype?: string }>();
    games.forEach((g) => {
      const isWinnerA = g.winner === "teamA";
      const p = isWinnerA ? g.playerA : g.playerB;
      const team = isWinnerA ? teamAName : teamBName;
      if (p?.ign) {
        const cur = playerWins.get(p.ign) || { ign: p.ign, team, wins: 0, archetype: p.archetype };
        cur.wins += 1;
        playerWins.set(p.ign, cur);
      }
    });

    const sorted = Array.from(playerWins.values()).sort((a, b) => b.wins - a.wins);
    return sorted[0] || null;
  }, [games, teamAName, teamBName]);

  if (!match || (open !== undefined && !open)) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/40">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-primary">
              RINGKASAN PERTANDINGAN • WEEK {match.weekNumber || weekNumber || 1}
            </div>
            <div className="text-xs font-bold text-muted-foreground truncate max-w-[280px] sm:max-w-md">
              {match.groupName || "Official Stage"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ISI MODAL */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* SCOREBOARD UTAMA */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/70">
            {/* TIM A */}
            <div className="flex flex-col items-center text-center min-w-0">
              <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center mb-1 shrink-0">
                {teamALogo ? (
                  <Image src={teamALogo} alt={teamAName} fill sizes="48px" className="object-cover rounded-full" unoptimized />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="font-bold text-[11px] sm:text-xs truncate w-full">{teamAName}</span>
            </div>

            {/* SKOR */}
            <div className="flex flex-col items-center justify-center px-2 shrink-0">
              <div className="flex items-center gap-1.5 font-mono text-2xl sm:text-3xl font-black leading-none">
                <span className={scoreA > scoreB ? "text-primary" : "text-foreground/90"}>{scoreA}</span>
                <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl">—</span>
                <span className={scoreB > scoreA ? "text-primary" : "text-foreground/90"}>{scoreB}</span>
              </div>
              <span
                className={`mt-1.5 px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${
                  isFinished
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20 flex items-center gap-1"
                }`}
              >
                {!isFinished && <Radio className="h-2.5 w-2.5 animate-pulse" />}
                {isFinished ? "FINISHED" : "IN PROGRESS"}
              </span>
            </div>

            {/* TIM B */}
            <div className="flex flex-col items-center text-center min-w-0">
              <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center mb-1 shrink-0">
                {teamBLogo ? (
                  <Image src={teamBLogo} alt={teamBName} fill sizes="48px" className="object-cover rounded-full" unoptimized />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="font-bold text-[11px] sm:text-xs truncate w-full">{teamBName}</span>
            </div>
          </div>

          {/* TOP DUELIST */}
          {topDuelist && (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-slate-950 shrink-0">
                  <Crown className="h-4 w-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs truncate">{topDuelist.ign}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">({topDuelist.team})</span>
                  </div>
                  <span className="text-[9.5px] text-muted-foreground block truncate">
                    {topDuelist.archetype || "Top Performer"}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Menang</span>
                <span className="text-xs font-black font-mono">{topDuelist.wins} Game</span>
              </div>
            </div>
          )}

          {/* LINEUP RINGKAS */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Lineup Pemain
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-muted/20 border border-border/70 space-y-1">
                <div className="font-bold text-primary truncate text-[11px] pb-1 border-b border-border/50">
                  {teamAName}
                </div>
                {lineupA.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-1 text-[10.5px]">
                    <span className="truncate">{p.ign || p.playerName}</span>
                    <span className="font-mono text-[9.5px] text-muted-foreground font-semibold">
                      {p.winCount ?? 0}W - {p.loseCount ?? 0}L
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-muted/20 border border-border/70 space-y-1">
                <div className="font-bold text-rose-500 truncate text-[11px] pb-1 border-b border-border/50">
                  {teamBName}
                </div>
                {lineupB.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-1 text-[10.5px]">
                    <span className="truncate">{p.ign || p.playerName}</span>
                    <span className="font-mono text-[9.5px] text-muted-foreground font-semibold">
                      {p.winCount ?? 0}W - {p.loseCount ?? 0}L
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER TOMBOL KE HALAMAN ANALYTICS */}
        <div className="p-3 border-t border-border/80 bg-muted/30 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground truncate">
            {meta.referee ? `Wasit: ${meta.referee}` : "Official Match"}
          </span>
          <Link
            href={`/analytics?tab=reports&match=${match.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Lihat Match History Lengkap</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MatchReportModal;
          
