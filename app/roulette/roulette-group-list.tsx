"use client";

import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteGroupListProps {
  groupA: TeamItem[];
  groupB: TeamItem[];
  quotaA: number;
  quotaB: number;
}

export function RouletteGroupList({
  groupA,
  groupB,
  quotaA,
  quotaB,
}: RouletteGroupListProps) {
  return (
    <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
      {/* GROUP A */}
      <div className="flex h-full flex-col justify-between rounded-2xl border border-sky-500/20 bg-sky-950/10 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between border-b border-sky-500/20 pb-2">
          <h3 className="font-extrabold text-sky-400">GROUP A</h3>
          <span className="text-[10px] font-bold text-muted-foreground">
            {groupA.length} / {quotaA} TIM
          </span>
        </div>
        <ul className="flex flex-1 flex-col justify-between space-y-2">
          {Array.from({ length: quotaA || 1 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground">Posisi #{i + 1}</span>
              {groupA[i] ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-background border border-border shrink-0">
                    {groupA[i].logo ? (
                      <img
                        src={groupA[i].logo}
                        alt={groupA[i].name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.webp";
                        }}
                      />
                    ) : (
                      <span className="text-[8px] text-muted-foreground">N/A</span>
                    )}
                  </div>
                  <span className="font-bold text-foreground">{groupA[i].name}</span>
                </div>
              ) : (
                <span className="italic text-muted-foreground/40">Menunggu Pengundian...</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* GROUP B */}
      <div className="flex h-full flex-col justify-between rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between border-b border-amber-500/20 pb-2">
          <h3 className="font-extrabold text-amber-400">GROUP B</h3>
          <span className="text-[10px] font-bold text-muted-foreground">
            {groupB.length} / {quotaB} TIM
          </span>
        </div>
        <ul className="flex flex-1 flex-col justify-between space-y-2">
          {Array.from({ length: Math.max(quotaB, 1) }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground">Posisi #{i + 1}</span>
              {groupB[i] ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-background border border-border shrink-0">
                    {groupB[i].logo ? (
                      <img
                        src={groupB[i].logo}
                        alt={groupB[i].name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.webp";
                        }}
                      />
                    ) : (
                      <span className="text-[8px] text-muted-foreground">N/A</span>
                    )}
                  </div>
                  <span className="font-bold text-foreground">{groupB[i].name}</span>
                </div>
              ) : (
                <span className="italic text-muted-foreground/40">Menunggu Pengundian...</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}