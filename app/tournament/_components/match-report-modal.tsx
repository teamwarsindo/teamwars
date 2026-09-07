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

  // Fetch report data dari Redis
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

  // Metadata & Detail Tim
  const meta = report?.metadata || {};
  const teamAName = report?.teamA?.name || match.teamAName;
  const teamBName = report?.teamB?.name || match.teamBName;
  const teamALogo = match.teamALogo || "/logo.webp";
  const teamBLogo = match.teamBLogo || "/logo.webp";

  const scoreA = report?.teamA?.score ?? report?.finalScore?.teamA ?? match.scoreA ?? 0;
  const scoreB = report?.teamB?.score ?? report?.finalScore?.teamB ?? match.scoreB ?? 0;
  const isFinished = report?.isFinished ?? (scoreA >= 10 || scoreB >= 10 || match.isFinished);

  const referee = meta.referee || match.referee || "Belum Ditugaskan";
  const streamer = meta.streamer || match.streamer || "-";
  const streamUrl = meta.streamUrl || match.streamLink;
  const targetWeek = report?.week || weekNumber || 6;

  const lineupA: any[] = report?.teamA?.lineup || [];
  const lineupB: any[] = report?.teamB?.lineup || [];
  const games: any[] = report?.games || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 text-neutral-100 shadow-2xl backdrop-blur-xl">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-white/5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
              OFFICIAL MATCH REPORT • {match.groupName} (WEEK {targetWeek})
            </span>
            <h3 className="text-sm font-extrabold text-foreground">
              {teamAName} <span className="text-muted-foreground font-normal">vs</span> {teamBName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* BODY CONTAINER (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          
          {/* INFO PETUGAS & STREAMER */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px]">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Referee / Wasit</span>
              <span className="font-semibold text-foreground">{referee}</span>
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
                  {streamer || "Tonton Live"} ↗
                </a>
              ) : (
                <span className="font-semibold text-foreground">{streamer}</span>
              )}
            </div>
          </div>

          {/* SCOREBOARD UTAMA */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-white/[0.02] to-rose-500/10 border border-white/10">
            {/* SISI TIM A */}
            <div className="flex items-center gap-2.5 max-w-[38%]">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-black/40 border border-white/10 p-1 flex items-center justify-center">
                <img src={teamALogo} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <span className="font-extrabold text-sm sm:text-base truncate text-foreground">{teamAName}</span>
            </div>

            {/* SKOR */}
            <div className="text-center px-2 shrink-0">
              <div className="text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
                <span className={scoreA > scoreB ? "text-blue-400" : "text-neutral-400"}>{scoreA}</span>
                <span className="text-muted-foreground/60 text-lg">-</span>
                <span className={scoreB > scoreA ? "text-rose-400" : "text-neutral-400"}>{scoreB}</span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-0.5 border ${
                isFinished 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                {isFinished ? "MATCH FINISHED" : "IN PROGRESS"}
              </span>
            </div>

            {/* SISI TIM B */}
            <div className="flex items-center justify-end gap-2.5 max-w-[38%] text-right">
              <span className="font-extrabold text-sm sm:text-base truncate text-foreground">{teamBName}</span>
              <div className="h-10 w-10 shrink-0 rounded-lg bg-black/40 border border-white/10 p-1 flex items-center justify-center">
                <img src={teamBLogo} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          </div>

          {/* ACTIVE LINEUP & DECK LIST */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Lineup Pemain & Deck Pilihan
            </span>

            {lineupA.length === 0 && lineupB.length === 0 ? (
              <div className="p-4 text-center text-xs italic text-muted-foreground bg-white/[0.02] border border-white/5 rounded-xl">
                Lineup pemain belum disubmit oleh kapten kedua tim.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                {/* LINEUP A */}
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
                    <span className="font-bold text-blue-400 truncate">{teamAName}</span>
                    <span className="text-[9px] text-white/50">{lineupA.length} Players</span>
                  </div>
                  <div className="space-y-2">
                    {lineupA.map((p: any, i: number) => (
                      <div key={i} className="text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <strong className="text-foreground">{i + 1}. {p.ign}</strong>
                          <span className="text-[9px] font-mono text-white/40">{p.idDuelLinks}</span>
                        </div>
                        <div className="text-[10px] pl-3 border-l border-white/10 mt-0.5 space-y-0.5">
                          <div className={p.deck1?.isDead ? "line-through opacity-50" : "text-white/80"}>
                            • {p.deck1?.archetype || "-"} <span className="italic text-white/40">({p.deck1?.skill || "-"})</span>
                          </div>
                          {p.deck2 && (
                            <div className={p.deck2?.isDead ? "line-through opacity-50" : "text-white/80"}>
                              • {p.deck2?.archetype || "-"} <span className="italic text-white/40">({p.deck2?.skill || "-"})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LINEUP B */}
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-1.5">
                    <span className="font-bold text-rose-400 truncate">{teamBName}</span>
                    <span className="text-[9px] text-white/50">{lineupB.length} Players</span>
                  </div>
                  <div className="space-y-2">
                    {lineupB.map((p: any, i: number) => (
                      <div key={i} className="text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <strong className="text-foreground">{i + 1}. {p.ign}</strong>
                          <span className="text-[9px] font-mono text-white/40">{p.idDuelLinks}</span>
                        </div>
                        <div className="text-[10px] pl-3 border-l border-white/10 mt-0.5 space-y-0.5">
                          <div className={p.deck1?.isDead ? "line-through opacity-50" : "text-white/80"}>
                            • {p.deck1?.archetype || "-"} <span className="italic text-white/40">({p.deck1?.skill || "-"})</span>
                          </div>
                          {p.deck2 && (
                            <div className={p.deck2?.isDead ? "line-through opacity-50" : "text-white/80"}>
                              • {p.deck2?.archetype || "-"} <span className="italic text-white/40">({p.deck2?.skill || "-"})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RINCIAN LOG GAME */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Rincian Log Game ({games.length} Game Dimainkan)
            </span>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-white/[0.02] border border-white/5 rounded-xl">
                Memuat riwayat duel dari database...
              </div>
            ) : games.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-muted-foreground bg-white/[0.02] border border-white/5 rounded-xl">
                Belum ada rincian game yang dipublikasikan untuk pertandingan ini.
              </div>
            ) : (
              <div className="space-y-2">
                {games.map((g: any, idx: number) => {
                  const isAWin = g.winner === "teamA";
                  const pA = g.playerA || {};
                  const pB = g.playerB || {};

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition flex flex-col gap-2"
                    >
                      {/* BARIS ATAS: NO GAME, BADGE DECKLOSS / REPEAT, DAN PEMENANG */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-white/60 font-mono">
                          GAME #{g.gameNumber || idx + 1}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {g.isDeckloss && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              DECKLOSS
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md font-black text-[9px] border ${
                              isAWin
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            WIN: {isAWin ? teamAName : teamBName}
                          </span>
                        </div>
                      </div>

                      {/* DUEL GRID RESPONSIF (PEMAIN A VS PEMAIN B) */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px] pt-1 border-t border-white/5">
                        {/* PEMAIN A */}
                        <div className={`space-y-0.5 ${isAWin ? "opacity-100" : "opacity-60"}`}>
                          <div className="flex items-center gap-1">
                            <strong className="text-foreground truncate">{pA.ign || "-"}</strong>
                            {pA.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded">R</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {pA.archetype || "-"}
                          </div>
                          <div className="text-[9px] text-neutral-400 truncate italic">
                            {pA.skill || "-"}
                          </div>
                        </div>

                        {/* VS BADGE */}
                        <div className="text-[9px] font-black text-white/30 px-1.5 py-0.5 rounded bg-white/5">
                          VS
                        </div>

                        {/* PEMAIN B */}
                        <div className={`space-y-0.5 text-right ${!isAWin ? "opacity-100" : "opacity-60"}`}>
                          <div className="flex items-center justify-end gap-1">
                            {pB.isRepeat && (
                              <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded">R</span>
                            )}
                            <strong className="text-foreground truncate">{pB.ign || "-"}</strong>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {pB.archetype || "-"}
                          </div>
                          <div className="text-[9px] text-neutral-400 truncate italic">
                            {pB.skill || "-"}
                          </div>
                        </div>
                      </div>

                      {/* CATATAN TAMBAHAN DARI WASIT / PENALTI */}
                      {g.notes && (
                        <div className="text-[9px] text-amber-400/90 italic bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10">
                          Catatan: {g.notes}
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
