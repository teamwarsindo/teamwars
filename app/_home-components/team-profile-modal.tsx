"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem } from "@/lib/types/tournament";
import { X, Trophy, Swords, Users, Loader2, Crown, Activity, Copy, Check } from "lucide-react";

export function TeamProfileModal({ team, allSchedules, onClose }: { team: any; allSchedules: MatchScheduleItem[]; onClose: () => void }) {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fetch(`/api/tournament/team-roster?teamName=${encodeURIComponent(team.teamName)}`)
      .then((r) => r.json())
      .then((j) => j.success && setRoster(j.data.players || []))
      .finally(() => setLoading(false));
    return () => { document.body.style.overflow = prev; };
  }, [team.teamName]);

  const copy = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { history, nextMatch, streak } = useMemo(() => {
    const q = team.teamName.toLowerCase();
    const matches = allSchedules.filter((m) => m.teamAName.toLowerCase() === q || m.teamBName.toLowerCase() === q);
    const hist = matches.filter((m) => m.isFinished).sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()).map((m) => {
      const isA = m.teamAName.toLowerCase() === q;
      return { id: m.id, week: m.weekNumber, isWin: (isA ? m.scoreA : m.scoreB)! > (isA ? m.scoreB : m.scoreA)!, myScore: isA ? m.scoreA : m.scoreB, oppScore: isA ? m.scoreB : m.scoreA, oppName: isA ? m.teamBName : m.teamAName, oppLogo: isA ? m.teamBLogo : m.teamALogo };
    });
    return { history: hist, nextMatch: matches.find((m) => !m.isFinished), streak: [...hist].slice(0, 5).reverse().map((h) => (h.isWin ? "W" : "L")) };
  }, [team.teamName, allSchedules]);

  const total = (team.matchWins || 0) + (team.matchLosses || 0);
  const wr = total > 0 ? Math.round((team.matchWins / total) * 100) : 0;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-border/70 bg-slate-950 text-foreground shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border/40 bg-slate-900/95 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <img src={team.teamLogo || "/logo.webp"} alt="" className="h-9 w-9 object-contain shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">{team.teamName}</h2>
              <p className="text-[10.5px] font-semibold text-primary">{team.groupName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* STATS */}
          <div className="space-y-2 rounded-2xl border border-border/50 bg-slate-900/50 p-3">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span className="font-bold flex items-center gap-1 text-foreground"><Activity className="h-3.5 w-3.5 text-primary" /> PERFORMA</span>
              <div className="flex gap-1">
                {streak.map((s, i) => (
                  <span key={i} className={`h-4 w-4 flex items-center justify-center rounded text-[8.5px] font-black ${s === "W" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{s}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-primary/10 border border-primary/20 py-1.5"><span className="block text-[8.5px] text-muted-foreground font-bold">POIN</span><span className="text-sm font-black text-primary">{team.points}</span></div>
              <div className="rounded-xl bg-muted/20 border border-border/40 py-1.5"><span className="block text-[8.5px] text-muted-foreground font-bold">SET</span><span className="text-xs font-black">{team.setWins || 0}</span></div>
              <div className="rounded-xl bg-muted/20 border border-border/40 py-1.5"><span className="block text-[8.5px] text-muted-foreground font-bold">RD</span><span className={`text-xs font-black ${team.roundDifference > 0 ? "text-emerald-400" : team.roundDifference < 0 ? "text-rose-400" : ""}`}>{team.roundDifference > 0 ? `+${team.roundDifference}` : team.roundDifference}</span></div>
              <div className="rounded-xl bg-muted/20 border border-border/40 py-1.5"><span className="block text-[8.5px] text-muted-foreground font-bold">WIN RATE</span><span className="text-xs font-black text-amber-400">{wr}%</span></div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-rose-500/30 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${wr}%` }} /></div>
          </div>

          {/* NEXT MATCH */}
          {nextMatch && (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-2.5 space-y-1.5">
              <span className="text-[9.5px] font-black text-sky-400 flex items-center gap-1"><Swords className="h-3 w-3" /> Laga Berikutnya (Week {nextMatch.weekNumber})</span>
              <div className="flex items-center justify-between bg-slate-950/90 p-2 rounded-xl border border-sky-500/20 text-[11px] font-bold">
                <span className="truncate flex-1">{nextMatch.teamAName}</span>
                <span className="text-[9px] px-2 text-sky-400">VS</span>
                <span className="truncate flex-1 text-right">{nextMatch.teamBName}</span>
              </div>
            </div>
          )}

          {/* HISTORY */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" /> Riwayat Pertandingan</span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {history.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-900/60 border border-border/40 px-3 py-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black ${m.isWin ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{m.isWin ? "WIN" : "LOSE"}</span>
                    <span className="text-muted-foreground text-[10px]">vs</span>
                    <img src={m.oppLogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain" />
                    <span className="truncate font-bold">{m.oppName}</span>
                  </div>
                  <span className="rounded bg-slate-950 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground mx-2">Week {m.week}</span>
                  <span className="font-black text-xs min-w-[40px] text-right"><span className={m.isWin ? "text-emerald-400" : ""}>{m.myScore}</span> - <span className={!m.isWin ? "text-rose-400" : ""}>{m.oppScore}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* ROSTER */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-black uppercase text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3 text-primary" /> Roster Anggota</span>
            {loading ? (
              <div className="py-3 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Memuat roster...</div>
            ) : (
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                {roster.map((p, idx) => {
                  const dl = p.idDuelLinks || p.duelId;
                  const isCap = p.role === "Ketua" || p.role === "Kapten";
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-border/40 bg-slate-900/60 px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                        {isCap ? <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" /> : <span className="text-[9px] text-muted-foreground w-3 text-center shrink-0">{idx + 1}</span>}
                        <span className="font-bold text-[11px] truncate">{p.ign || p.playerName || p.namaLengkap}</span>
                      </div>
                      {dl && (
                        <button onClick={() => copy(dl)} className="flex items-center gap-1 bg-slate-950 border border-border/40 px-1.5 py-0.5 rounded font-mono text-[9px] text-muted-foreground hover:text-foreground">
                          {copiedId === dl ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 text-primary" />}
                          <span>{copiedId === dl ? "Disalin" : dl}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t border-border/40 bg-slate-900/95 p-3">
          <button onClick={onClose} className="w-full rounded-2xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">Tutup Profil Tim</button>
        </div>

      </div>
    </div>,
    document.body
  );
}
