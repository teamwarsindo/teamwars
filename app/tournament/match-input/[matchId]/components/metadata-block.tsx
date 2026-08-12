"use client";

import { ShieldCheck, Clock } from "lucide-react";
import { CustomSelect } from "./custom-select";

interface MetadataBlockProps {
  referee: string;
  streamer: string;
  streamLink: string;
  teamAName?: string;
  teamBName?: string;
  lateDecksA: number;
  setLateDecksA: (v: number) => void;
  lateDecksB: number;
  setLateDecksB: (v: number) => void;
}

export function MetadataBlock({
  referee,
  streamer,
  streamLink,
  teamAName = "Tim A",
  teamBName = "Tim B",
  lateDecksA,
  setLateDecksA,
  lateDecksB,
  setLateDecksB,
}: MetadataBlockProps) {
  // Opsi 0 sampai 10 Deck Telat (0m - 20m)
  const options = Array.from({ length: 11 }, (_, i) => `${i} (${i * 2} m)`);

  const handleSelectA = (val: string) => {
    const num = parseInt(val.split(" ")[0]) || 0;
    setLateDecksA(num);
  };

  const handleSelectB = (val: string) => {
    const num = parseInt(val.split(" ")[0]) || 0;
    setLateDecksB(num);
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wide">
            1. Petugas &amp; Penalti Pre-Match
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">
            Wasit (Referee)
          </span>
          <span className="font-extrabold text-foreground text-xs mt-0.5 block truncate">
            {referee || "Belum Ditugaskan"}
          </span>
        </div>

        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">
            Caster / Streamer
          </span>
          <span className="font-extrabold text-foreground text-xs mt-0.5 block truncate">
            {streamer || "Belum Ditugaskan"}
          </span>
        </div>

        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">
            Link Live Stream
          </span>
          {streamLink && streamLink.startsWith("http") ? (
            <a
              href={streamLink}
              target="_blank"
              rel="noreferrer"
              className="font-extrabold text-primary text-xs mt-0.5 block truncate hover:underline"
            >
              {streamLink}
            </a>
          ) : (
            <span className="font-extrabold text-muted-foreground text-xs mt-0.5 block truncate">
              {streamLink || "Belum Tersedia"}
            </span>
          )}
        </div>
      </div>

      {/* INPUT PENALTI DECK TELAT SUBMIT DENGAN CUSTOM SELECT */}
      <div className="pt-2 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-foreground uppercase mb-2">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Penalti Telat Submit Deck (1 Deck = -2 Menit)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-primary truncate block">
              {teamAName}
            </span>
            <CustomSelect
              value={`${lateDecksA} (${lateDecksA * 2} m)`}
              onChange={handleSelectA}
              options={options}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-500 truncate block">
              {teamBName}
            </span>
            <CustomSelect
              value={`${lateDecksB} (${lateDecksB * 2} m)`}
              onChange={handleSelectB}
              options={options}
            />
          </div>
        </div>
      </div>
    </section>
  );
}