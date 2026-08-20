"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
} from "@/app/tournament/_library/calculator";
import { X, Swords, Flame, Trophy } from "lucide-react";

interface MatchH2HModalProps {
  match: MatchScheduleItem | null;
  currentWeek: number;
  standings?: ExtendedStandingItem[];
  onClose: () => void;
}

function formatFullSchedule(dateStr?: string) {
  if (!dateStr) return "Waktu Belum Ditentukan";
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timePart = d
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(".", ":");
    return `${datePart} • ${timePart} WIB`;
  } catch {
    return dateStr;
  }
}

export function MatchH2HModal({ match, currentWeek, standings = [], onClose }: MatchH2HModalProps) {
  if (!match) return null;

  const statsA = useMemo(() => getTeamStatsFromStandings(match.teamAName, standings), [match.teamAName, standings]);
  const statsB = useMemo(() => getTeamStatsFromStandings(match.teamBName, standings), [match.teamBName, standings]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* HEADER MATCH INFO */}
        <div className="text-center space-y-0.5 pr-6">
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
            <Swords className="h-2.5 w-2.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
          </span>
          <p className="text-[10px] text-muted-foreground font-medium">
            {formatFullSchedule(match.matchDate)}
          </p>
        </div>

        {/* TEAM VS DISPLAY */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 p-2.5 border border-border/50">
          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-8 w-8 object-contain" />
            <span className="text-[10.5px] font-bold text-foreground truncate w-full">{match.teamAName}</span>
          </div>

          <div className="px-2 shrink-0 text-center">
            <span className="text-xs font-black text-primary">VS</span>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-8 w-8 object-contain" />
            <span className="text-[10.5px] font-bold text-foreground truncate w-full">{match.teamBName}</span>
          </div>
        </div>

        {/* STATS MATRIX */}
        <div className="space-y-1.5 text-[10px]">
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Trophy className="h-2.5 w-2.5 text-primary" /> Perbandingan Statistik Season 7
          </span>

          <div className="rounded-xl border border-border/60 bg-muted/10 divide-y divide-border/40 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-bold text-foreground">#{statsA.rank}</span>
              <span className="text-muted-foreground font-medium text-[9px]">Peringkat Klasemen</span>
              <span className="font-bold text-foreground">#{statsB.rank}</span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-bold text-foreground">{statsA.matchWins}W - {statsA.matchLosses}L</span>
              <span className="text-muted-foreground font-medium text-[9px]">Rekor Match</span>
              <span className="font-bold text-foreground">{statsB.matchWins}W - {statsB.matchLosses}L</span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-bold text-primary">{statsA.winRate}%</span>
              <span className="text-muted-foreground font-medium text-[9px]">Win Rate</span>
              <span className="font-bold text-primary">{statsB.winRate}%</span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={`font-bold ${Number(statsA.roundDifference) > 0 ? "text-emerald-500" : Number(statsA.roundDifference) < 0 ? "text-rose-500" : "text-foreground"}`}>
                {statsA.roundDifference}
              </span>
              <span className="text-muted-foreground font-medium text-[9px]">Selisih Poin (Diff)</span>
              <span className={`font-bold ${Number(statsB.roundDifference) > 0 ? "text-emerald-500" : Number(statsB.roundDifference) < 0 ? "text-rose-500" : "text-foreground"}`}>
                {statsB.roundDifference}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-bold text-foreground">{statsA.setWins}</span>
              <span className="text-muted-foreground font-medium text-[9px]">Total Scored</span>
              <span className="font-bold text-foreground">{statsB.setWins}</span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                {statsA.form.length ? (
                  statsA.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.2 text-[7.5px] font-black ${
                        res === "W" ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8px]">-</span>
                )}
              </div>

              <span className="text-muted-foreground font-medium text-[9px] flex items-center gap-0.5">
                <Flame className="h-2.5 w-2.5 text-amber-500" /> Form Laga
              </span>

              <div className="flex items-center gap-0.5">
                {statsB.form.length ? (
                  statsB.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.2 text-[7.5px] font-black ${
                        res === "W" ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8px]">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[9px] text-muted-foreground">
          <span>{match.streamer ? `🎙️ ${match.streamer}` : "📺 Butuh Streamer"}</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}