"use client";

import { ShieldCheck, Info } from "lucide-react";

interface MetadataBlockProps {
  referee: string;
  setReferee?: (v: string) => void;
  streamer: string;
  setStreamer?: (v: string) => void;
  streamLink: string;
  setStreamLink?: (v: string) => void;
}

export function MetadataBlock({
  referee,
  streamer,
  streamLink,
}: MetadataBlockProps) {
  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wide">
            1. Petugas &amp; Live Stream Match
          </h3>
        </div>
        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
          <Info className="h-3 w-3" /> Admin Managed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">Wasit (Referee)</span>
          <span className="font-extrabold text-foreground text-xs mt-0.5 block truncate">
            {referee || "Belum Ditugaskan"}
          </span>
        </div>

        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">Caster / Streamer</span>
          <span className="font-extrabold text-foreground text-xs mt-0.5 block truncate">
            {streamer || "Belum Ditugaskan"}
          </span>
        </div>

        <div className="p-2.5 bg-muted/20 rounded-xl border border-border/30">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">Link Live Stream</span>
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
    </section>
  );
}
