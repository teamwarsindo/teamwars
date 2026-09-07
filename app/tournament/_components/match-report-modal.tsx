"use client";

import { useEffect, useState } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";

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
        const res = await fetch(`/api/tournament/match-report?matchId=${match.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setReport(json.data);
        } else {
          setReport(null);
        }
      } catch (err) {
        console.error("Gagal memuat report data:", err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [match?.id, open]);

  if (!match || (open !== undefined && !open)) return null;

  const meta = report?.metadata || {};
  const teamAName = report?.teamA?.name || match.teamAName;
  const teamBName = report?.teamB?.name || match.teamBName;
  const teamALogo = match.teamALogo || "/logo.webp";
  const teamBLogo = match.teamBLogo || "/logo.webp";

  const scoreA = report?.teamA?.score ?? report?.finalScore?.teamA ?? match.scoreA ?? 0;
  const scoreB = report?.teamB?.score ?? report?.finalScore?.teamB ?? match.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10 || match.isFinished);

  const referee = meta.referee || match.referee || "-";
  const streamer = meta.streamer || match.streamer || "-";
  const streamUrl = meta.streamUrl || match.streamLink;
  const targetWeek = report?.week || weekNumber || 6;

  const lineupA: any[] = report?.teamA?.lineup || [];
  const lineupB: any[] = report?.teamB?.lineup || [];
  const games: any[] = report?.games || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-primary">
              MATCH REPORT • WEEK {targetWeek}
            </div>
            <div className="text-xs font-bold text-muted-foreground truncate">
              {match.groupName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-xs">
          
          {/* PETUGAS & STREAMER */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border text-[11px]">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Referee</span>
              <span className="font-semibold truncate block">{referee}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Streamer / Live</span>
              {streamUrl ? (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline truncate block"
                >
                  {streamer} ↗
                </a>
              ) : (
                <span className="font-semibold truncate block">{streamer}</span>
              )}
            </div>
          </div>

          {/* SCOREBOARD UTAMA */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border">
            {/* TIM A */}
            <div className="flex items-center gap-2 truncate">
              <img src={teamALogo} alt="" className="h-7 w-7 object-contain shrink-0" />
              <span className="font-extrabold text-xs sm:text-sm truncate">{teamAName}</span>
            </div>

            {/* SKOR */}
            <div className="text-center px-3 shrink-0">
              <div className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                <span className={scoreA > scoreB ? "text-primary font-black" : "text-muted-foreground"}>{scoreA}</span>
                <span className="text-muted-foreground/50 mx-1.5">-</span>
                <span className={scoreB > scoreA ? "text-primary font-black" : "text-muted-foreground"}>{scoreB}</span>
              </div>
              <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider mt-1 border ${
                isFinished 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}>
                {isFinished ? "FINISHED" : "IN PROGRESS"}
              </span>
            </div>

            {/* TIM B */}
            <div className="flex items-center justify-end gap-2 truncate text-right">
              <span className="font-extrabold text-xs sm:text-sm truncate">{teamBName}</span>
              <img src={teamBLogo} alt="" className="h-7 w-7 object-contain shrink-0" />
            </div>
          </div>

          {/* ACTIVE LINEUP (HANYA NAMA PEMAIN) */}
          {(lineupA.length > 0 || lineupB.length > 0) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Lineup Bertanding
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {/* LINEUP TIM A */}
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border space-y-1">
                  <div className="font-bold text-primary truncate text-[11px] pb-1 border-b border-border/50">
                    {teamAName}
                  </div>
                  <div className="space-y-0.5">
                    {lineupA.map((p: any, i: number) => (
                      <div key={i} className="truncate text-foreground/90 flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 text-[10px] w-3">{i + 1}.</span>
                        <span className="font-medium truncate">{p.ign || p.playerName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LINEUP TIM B */}
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border space-y-1">
                  <div className="font-bold text-rose-500 truncate text-[11px] pb-1 border-b border-border/50">
                    {teamBName}
                  </div>
                  <div className="space-y-0.5">
                    {lineupB.map((p: any, i: number) => (
                      <div key={i} className="truncate text-foreground/90 flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 text-[10px] w-3">{i + 1}.</span>
                        <span className="font-medium truncate">{p.ign || p.playerName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RINCIAN LOG GAME RINGKAS */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Log Duel ({games.length} Game)
            </span>

            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 border border-border rounded-xl">
                Memuat riwayat duel...
              </div>
            ) : games.length === 0 ? (
              <div className="p-6 text-center text-xs italic text-muted-foreground bg-muted/20 border border-border rounded-xl">
                Belum ada log game yang dipublikasikan.
              </div>
            ) : (
              <div className="space-y-1.5">
                {games.map((g: any, idx: number) => {
                  const isAWin = g.winner === "teamA";
                  const pA = g.playerA || {};
                  const pB = g.playerB || {};

                  return (
                    <div
                      key={idx}
                      className="p-2 sm:p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/60 transition flex flex-col gap-1"
                    >
                      {/* HEADER GAME ROW */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold font-mono text-muted-foreground">
                          #{g.gameNumber || idx + 1}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {g.isDeckloss && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              DECKLOSS
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                              isAWin
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            }`}
                          >
                            WIN: {isAWin ? teamAName : teamBName}
                          </span>
                        </div>
                      </div>

                      {/* DUEL INFO: 1 BARIS COMPACT */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-[11px] pt-1 border-t border-border/40">
                        {/* PEMAIN A */}
                        <div className={`truncate ${isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="truncate flex items-center gap-1">
                            <span className="truncate">{pA.ign || "-"}</span>
                            {pA.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1 rounded border border-amber-500/30">R</span>
                            )}
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 truncate">
                            {pA.archetype || "-"}
                          </div>
                        </div>

                        {/* VS BADGE */}
                        <div className="text-[8px] font-bold text-muted-foreground px-1">
                          vs
                        </div>

                        {/* PEMAIN B */}
                        <div className={`text-right truncate ${!isAWin ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          <div className="truncate flex items-center justify-end gap-1">
                            {pB.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1 rounded border border-amber-500/30">R</span>
                            )}
                            <span className="truncate">{pB.ign || "-"}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground/80 truncate">
                            {pB.archetype || "-"}
                          </div>
                        </div>
                      </div>

                      {/* CATATAN RINGKAS (JIKA ADA) */}
                      {g.notes && (
                        <div className="text-[9px] text-amber-500/90 italic bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 mt-0.5">
                          {g.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
