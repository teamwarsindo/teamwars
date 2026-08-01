"use client";

import { TeamItem } from "@/app/api/roulette-state/route";

interface GroupCardProps {
  title: string;
  colorTheme: "sky" | "amber";
  teams: TeamItem[];
  quota: number;
}

export function GroupCard({ title, colorTheme, teams, quota }: GroupCardProps) {
  const isSky = colorTheme === "sky";

  return (
    <div className={`rounded-2xl border p-5 backdrop-blur-md ${
      isSky ? "border-sky-500/20 bg-sky-950/10" : "border-amber-500/20 bg-amber-950/10"
    }`}>
      <div className={`mb-3 flex items-center justify-between border-b pb-2 ${
        isSky ? "border-sky-500/20" : "border-amber-500/20"
      }`}>
        <h3 className={`font-extrabold ${isSky ? "text-sky-400" : "text-amber-400"}`}>{title}</h3>
        <span className="text-[10px] font-bold text-muted-foreground">
          {teams.length} / {quota} TIM
        </span>
      </div>

      <ul className="space-y-2">
        {Array.from({ length: Math.max(quota, 1) }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
          >
            <span className="text-muted-foreground">Posisi #{i + 1}</span>
            {teams[i] ? (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-background border border-border shrink-0">
                  {teams[i].logo ? (
                    <img
                      src={teams[i].logo}
                      alt={teams[i].name}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/logo.webp"; }}
                    />
                  ) : (
                    <span className="text-[8px] text-muted-foreground">N/A</span>
                  )}
                </div>
                <span className="font-bold text-foreground">{teams[i].name}</span>
              </div>
            ) : (
              <span className="italic text-muted-foreground/40">Menunggu Pengundian...</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
