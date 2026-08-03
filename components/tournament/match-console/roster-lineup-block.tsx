"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function RosterLineupBlock({
  match,
  rosterA,
  setRosterA,
  rosterB,
  setRosterB,
  availableIgnA,
  availableIgnB,
  onSave,
}: {
  match: MatchScheduleItem | null;
  rosterA: string[];
  setRosterA: (v: string[]) => void;
  rosterB: string[];
  setRosterB: (v: string[]) => void;
  availableIgnA: string[];
  availableIgnB: string[];
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-sky-500/30 bg-[#001738] p-4 shadow-md space-y-3">
      <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
        <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">
          2. Roster Pegawai (Main Players)
        </h3>
        <button
          onClick={onSave}
          className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
        >
          💾 Save Roster Lineup
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* TIM A ROSTER */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-white block">
            {match?.teamAName} (Tim A)
          </span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-center font-bold text-sky-400">{i + 1}.</span>
              <select
                value={rosterA[i] || ""}
                onChange={(e) => {
                  const updated = [...rosterA];
                  updated[i] = e.target.value;
                  setRosterA(updated);
                }}
                className="flex-1 rounded-xl bg-[#000d21] border border-sky-500/40 p-2 text-white font-semibold"
              >
                <option value="">-- Pilih Player DB --</option>
                {availableIgnA.map((ign) => (
                  <option key={ign} value={ign}>{ign}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* TIM B ROSTER */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-white block">
            {match?.teamBName} (Tim B)
          </span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-center font-bold text-sky-400">{i + 1}.</span>
              <select
                value={rosterB[i] || ""}
                onChange={(e) => {
                  const updated = [...rosterB];
                  updated[i] = e.target.value;
                  setRosterB(updated);
                }}
                className="flex-1 rounded-xl bg-[#000d21] border border-sky-500/40 p-2 text-white font-semibold"
              >
                <option value="">-- Pilih Player DB --</option>
                {availableIgnB.map((ign) => (
                  <option key={ign} value={ign}>{ign}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
              }
