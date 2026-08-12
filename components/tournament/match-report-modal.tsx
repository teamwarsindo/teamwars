"use client";

import { useEffect } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";

interface MatchReportModalProps {
  open?: boolean;
  match: MatchScheduleItem | null;
  weekNumber?: number;
  onClose: () => void;
  onSaveMatch?: (updatedMatch: MatchScheduleItem) => Promise<void>;
}

export function MatchReportModal({
  open,
  match,
  weekNumber,
  onClose,
}: MatchReportModalProps) {
  useEffect(() => {
    if (match || open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [match, open]);

  if (!match || (open !== undefined && !open)) return null;

  const gameLogs = match.gameLogs || [];
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="glass glow-border flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-popover/95 shadow-2xl animate-in zoom-in-95">
        {/* HEADER MODAL PUBLIK */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
          <div>
            <span className="text-[10px] font-black uppercase text-primary tracking-wider block">
              OFFICIAL MATCH REPORT • {match.groupName} {weekNumber ? `(Week ${weekNumber})` : ""}
            </span>
            <h3 className="text-sm font-extrabold text-foreground">
              {match.teamAName} vs {match.teamBName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted transition text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* KONTEN DETAIL MATCH REPORT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* WASIT & STREAMER INFO */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl border border-border/40 text-[11px]">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Referee (Wasit)</span>
              <span className="font-semibold text-foreground">{match.referee || "Analyst"}</span>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Streamer / Live</span>
              {match.streamLink ? (
                <a
                  href={match.streamLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline truncate block"
                >
                  {match.streamer || "Saksikan Stream"} ↗
                </a>
              ) : (
                <span className="font-semibold text-foreground">{match.streamer || "-"}</span>
              )}
            </div>
          </div>

          {/* SKOR AKHIR & LOGO */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2.5">
              <img src={match.teamALogo} alt="" className="h-8 w-8 object-contain" />
              <span className="font-extrabold text-foreground text-sm">{match.teamAName}</span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-primary">
                {match.scoreA} - {match.scoreB}
              </span>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                {match.isFinished ? "MATCH FINISHED" : "IN PROGRESS"}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-foreground text-sm">{match.teamBName}</span>
              <img src={match.teamBLogo} alt="" className="h-8 w-8 object-contain" />
            </div>
          </div>

          {/* ROSTER ACTIVE LINEUP */}
          {(rosterA.length > 0 || rosterB.length > 0) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Active Lineup Bertanding
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
                  <span className="font-extrabold text-primary block mb-1">{match.teamAName}</span>
                  <div className="space-y-0.5 text-muted-foreground">
                    {rosterA.map((p, i) => (
                      <div key={i} className="truncate">
                        {i + 1}. <strong className="text-foreground">{p.playerName}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
                  <span className="font-extrabold text-rose-500 block mb-1">{match.teamBName}</span>
                  <div className="space-y-0.5 text-muted-foreground">
                    {rosterB.map((p, i) => (
                      <div key={i} className="truncate">
                        {i + 1}. <strong className="text-foreground">{p.playerName}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABEL LOG GAME PER GAME */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Rincian Log Game ({gameLogs.length} Game)
            </span>

            {gameLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic border rounded-xl bg-card">
                Belum ada log rincian game yang dipublikasikan untuk pertandingan ini.
              </div>
            ) : (
              <div className="divide-y rounded-xl border border-border bg-card overflow-hidden text-[11px]">
                {gameLogs.map((log, idx) => {
                  const isAWin = log.winnerTeamId === match.teamAId;
                  const isAutoTL = log.playerAName === "-" || log.playerBName === "-";

                  return (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/20 transition">
                      <div className="space-y-0.5">
                        <span className="font-bold text-primary block">Game #{idx + 1}</span>
                        {isAutoTL ? (
                          <div className="text-muted-foreground italic">
                            <span className="text-rose-500 font-bold">[Technical Loss]</span> {log.deckA === "Line-up kurang" ? `${match.teamAName} Line-up kurang` : `${match.teamBName} Line-up kurang`}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            <strong className="text-foreground">{log.playerAName}</strong> ({log.deckA} / {log.skillA})
                            {log.isRepeatA && <span className="ml-1 text-[8px] font-black bg-amber-500 text-black px-1 rounded">R</span>}
                            {log.isTLA && <span className="ml-1 text-[8px] font-black bg-rose-500 text-white px-1 rounded">TL</span>}
                            <span className="mx-1 text-muted-foreground/60">vs</span>
                            <strong className="text-foreground">{log.playerBName}</strong> ({log.deckB} / {log.skillB})
                            {log.isRepeatB && <span className="ml-1 text-[8px] font-black bg-amber-500 text-black px-1 rounded">R</span>}
                            {log.isTLB && <span className="ml-1 text-[8px] font-black bg-rose-500 text-white px-1 rounded">TL</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right pl-2">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            isAWin
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          }`}
                        >
                          WIN: {isAWin ? match.teamAName : match.teamBName}
                        </span>
                      </div>
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