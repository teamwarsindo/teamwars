"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function PlayoffTab({ schedules }: { schedules: MatchScheduleItem[] }) {
  const playoffMatches = schedules.filter((s) => s.stage === "PLAYOFFS" || s.stage === "FINALS");

  if (playoffMatches.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
        <span className="mb-2 text-3xl">🏆</span>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary">
          Babak Playoffs Belum Dimulai
        </h3>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Jadwal dan bagan pertarungan babak playoffs akan otomatis diperbarui setelah fase grup selesai.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {playoffMatches.map((match) => (
        <div
          key={match.id}
          className="flex flex-col justify-between rounded-2xl border border-border bg-card/80 p-5 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
              {match.groupName}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {new Date(match.matchDate).toLocaleDateString("id-ID")}
            </span>
          </div>

          <div className="my-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={match.teamALogo} alt={match.teamAName} className="h-10 w-10 rounded-xl object-cover" />
              <span className="font-extrabold text-sm text-foreground">{match.teamAName}</span>
            </div>

            <div className="rounded-xl bg-background border border-border px-4 py-1.5 font-black text-base text-primary">
              {match.scoreA} : {match.scoreB}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sm text-foreground">{match.teamBName}</span>
              <img src={match.teamBLogo} alt={match.teamBName} className="h-10 w-10 rounded-xl object-cover" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
