"use client";

import { ShieldCheck, Clock, ExternalLink } from "lucide-react";
import { CustomSelect } from "../custom-select";
import { TOURNAMENT_CONFIG } from "../../constants/tournament";

interface Section1MetadataProps {
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

export function Section1Metadata({
  referee,
  streamer,
  streamLink,
  teamAName = "Tim A",
  teamBName = "Tim B",
  lateDecksA,
  setLateDecksA,
  lateDecksB,
  setLateDecksB,
}: Section1MetadataProps) {
  // Format Dropdown: 1 Deck (-2 Menit), 2 Deck (-4 Menit), dst.
  const options = Array.from(
    { length: TOURNAMENT_CONFIG.MAX_LATE_DECKS_OPTION + 1 },
    (_, i) => (i === 0 ? "0 Deck (Tepat Waktu)" : `${i} Deck (-${i * TOURNAMENT_CONFIG.PENALTY_MINUTES_PER_DECK} Menit)`)
  );

  const handleSelectA = (val: string) => {
    if (val.startsWith("0")) {
      setLateDecksA(0);
      return;
    }
    const num = parseInt(val.split(" ")[0]) || 0;
    setLateDecksA(num);
  };

  const handleSelectB = (val: string) => {
    if (val.startsWith("0")) {
      setLateDecksB(0);
      return;
    }
    const num = parseInt(val.split(" ")[0]) || 0;
    setLateDecksB(num);
  };

  const getValueDisplay = (num: number) => {
    if (num === 0) return "0 Deck (Tepat Waktu)";
    return `${num} Deck (-${num * TOURNAMENT_CONFIG.PENALTY_MINUTES_PER_DECK} Menit)`;
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
            Referee
          </span>
          <span className="font-extrabold text-foreground text-xs mt-0.5 block truncate">
            {referee || "Belum Ditugaskan"}
          </span>
        </div>

        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">
            Streamer
          </span>
          <span className="font-extrabold text-foreground text-xs mt-0.5 block truncate">
            {streamer || "Belum Ditugaskan"}
          </span>
        </div>

        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">
            Live Stream
          </span>
          {streamLink && streamLink.startsWith("http") ? (
            <a
              href={streamLink}
              target="_blank"
              rel="noreferrer"
              className="font-extrabold text-primary text-xs mt-0.5 flex items-center gap-1 hover:underline"
            >
              <span>Tonton Live Stream</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="font-extrabold text-muted-foreground text-xs mt-0.5 block truncate">
              {streamLink || "Belum Tersedia"}
            </span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-foreground uppercase mb-2">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>
            Penalti Telat Submit Deck (1 Deck = -{TOURNAMENT_CONFIG.PENALTY_MINUTES_PER_DECK} Menit)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground truncate block">
              {teamAName}
            </span>
            <CustomSelect
              value={getValueDisplay(lateDecksA)}
              onChange={handleSelectA}
              options={options}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground truncate block">
              {teamBName}
            </span>
            <CustomSelect
              value={getValueDisplay(lateDecksB)}
              onChange={handleSelectB}
              options={options}
            />
          </div>
        </div>
      </div>
    </section>
  );
}