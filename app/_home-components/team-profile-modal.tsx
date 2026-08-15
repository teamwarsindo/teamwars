"use client";

import { useEffect, useState, useMemo } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";
import { X, Trophy, Activity, Flame, Swords, Users, Loader2, Crown } from "lucide-react";

interface TeamProfileModalProps {
  team: any;
  allSchedules: MatchScheduleItem[];
  onClose: () => void;
}

export function TeamProfileModal({ team, allSchedules, onClose }: TeamProfileModalProps) {
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  // Lock scroll background saat modal aktif
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  // Fetch data roster resmi secara on-demand
  useEffect(() => {
    fetch(`/api/tournament/team-roster?teamName=${encodeURIComponent(team.teamName)}`)
      .then((res) => res.json())
      .then((json) => json.success && setRoster(json.data?.players || []))
      .catch((err) => console.error("Gagal load roster:", err))
      .finally(() => setLoadingRoster(false));
  }, [team.teamName]);

  // Cukup filter jadwal & riwayat (tanpa hitung ulang statistik)
  const { history, nextMatch } = useMemo(() => {
    const q = team.teamName.toLowerCase();
    const teamMatches = allSchedules.filter(
      (m) => m.teamAName.toLowerCase() === q || m.teamBName.toLowerCase() === q
    );

    return {
      history: teamMatches.filter((m) => m.isFinished),
      nextMatch: teamMatches.find((m) => !m.isFinished),
    };
  }, [team.teamName, allSchedules]);

  const totalMatches = (team.matchWins || 0) + (team.matchLosses || 0);
  const winRate = totalMatches > 0 ? Math.round((team.matchWins / totalMatches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border/80 bg-slate-950 text-foreground shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border/50 bg-slate-900/90 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={team.teamLogo || "/logo.webp"} alt="" className="h-8 w-8 object-contain shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-black truncate">{team.teamName}</h2>
              <p className="text-[10px] font-bold text-primary">{team.groupName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* STATISTIK DARI STANDING */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-center">
              <span className="block text-[8.5px] font-bold text-muted-foreground">POINTS</span>
              <span className="text-sm font-black text-primary">{team.points}</span>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
              <span className="block text-[8.5px] font-bold text-muted-foreground">MATCH (W-L)</span>
              <span className="text-xs font-black">{team.matchWins}-{team.matchLosses}</span>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
              <span className="block text-[8.5px] font-bold text-muted-foreground">ROUND DIFF</span>
              <span className={`text-xs font-black ${team.roundDifference > 0 ? "text-emerald-400" : team.roundDifference < 0 ? "text-rose-400" : ""}`}>
                {team.roundDifference > 0 ? `+${team.roundDifference}` : team.roundDifference}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
              <span className="block text-[8.5px] font-bold text-muted-foreground">WIN RATE</span>
              <span className="text-xs font-black text-amber-400">{winRate}%</span>
            </div>
          </div>

          {/* LAGA BERIKUTNYA */}
          {nextMatch && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5">
              <span className="text-[9px] font-black uppercase text-sky-400 block mb-1.5 flex items-center gap-1">
                <Swords className="h-3 w-3" /> Laga Berikutnya
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold truncate">{nextMatch.teamAName}</span>
                <span className="text-[10px] font-black text-sky-400">VS</span>
                <span className="font-bold truncate text-right">{nextMatch.teamBName}</span>
              </div>
            </div>
          )}

          {/* RIWAYAT MATCH */}
          <div>
            <span className="text-[9.5px] font-black uppercase text-muted-foreground block mb-2 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Riwayat Pertandingan
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">Belum ada riwayat match.</p>
              ) : (
                history.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-1.5 text-[11px] border border-border/30">
                    <span className="text-muted-foreground font-semibold">W{m.weekNumber} vs {m.teamAName === team.teamName ? m.teamBName : m.teamAName}</span>
                    <span className="font-black">{m.scoreA} - {m.scoreB}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SKUAD / ROSTER */}
          <div>
            <span className="text-[9.5px] font-black uppercase text-muted-foreground block mb-2 flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" /> Roster Pemain
            </span>
            {loadingRoster ? (
              <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat data...
              </div>
            ) : roster.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {roster.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/20 border border-border/30 px-2 py-1">
                    <span className="font-bold truncate text-[10.5px]">{p.namaLengkap || p.ign || p.playerName}</span>
                    {p.role && <span className="text-[8.5px] text-muted-foreground shrink-0">{p.role}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground text-center py-2">Roster belum terdaftar.</p>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-border/50 bg-slate-900/90 p-2.5">
          <button onClick={onClose} className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
