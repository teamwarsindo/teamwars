"use client";

import { useEffect, useState } from "react";

interface StaffItem {
  discordId: string;
  discordName: string;
}

export function MetadataBlock({
  referee,
  setReferee,
  streamer,
  setStreamer,
  streamLink,
  setStreamLink,
}: {
  referee: string;
  setReferee: (v: string) => void;
  streamer: string;
  setStreamer: (v: string) => void;
  streamLink: string;
  setStreamLink: (v: string) => void;
}) {
  const [refereeList, setRefereeList] = useState<StaffItem[]>([]);
  const [streamerList, setStreamerList] = useState<StaffItem[]>([]);

  // Load Staf Wasit & Streamer dari API KV Staf
  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch("/api/tournament/staff");
        const data = await res.json();
        if (data.success) {
          setRefereeList(data.referees || []);
          setStreamerList(data.streamers || []);
        }
      } catch (err) {
        console.error("Gagal memuat staf:", err);
      }
    }
    fetchStaff();
  }, []);

  const selectBase =
    "w-full rounded-lg border border-border bg-background/60 p-2 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer";

  const inputBase =
    "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-foreground">1. Identitas Wasit & Streamer</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* DROPDOWN WASIT */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Wasit / Referee Bertugas
          </label>
          <select
            value={referee}
            onChange={(e) => setReferee(e.target.value)}
            className={selectBase}
          >
            <option value="">-- Pilih Wasit Bertugas --</option>
            {refereeList.map((r) => (
              <option key={r.discordId} value={r.discordName}>
                {r.discordName}
              </option>
            ))}
          </select>
        </div>

        {/* DROPDOWN STREAMER */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Streamer / Caster
          </label>
          <select
            value={streamer}
            onChange={(e) => setStreamer(e.target.value)}
            className={selectBase}
          >
            <option value="">-- Pilih Streamer --</option>
            {streamerList.map((s) => (
              <option key={s.discordId} value={s.discordName}>
                {s.discordName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Link TAYANGAN LIVE (YOUTUBE)
          </label>
          <input
            type="text"
            placeholder="https://youtube.com/live/..."
            value={streamLink}
            onChange={(e) => setStreamLink(e.target.value)}
            className={inputBase}
          />
        </div>
      </div>
    </section>
  );
            }
