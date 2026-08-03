"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function ConsoleHeader({
  match,
  isSaving,
  onSave,
  onExit,
}: {
  match: MatchScheduleItem | null;
  isSaving: boolean;
  onSave: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-sky-500/30 bg-[#001738] p-4 shadow-lg">
      <div>
        <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
          REFEREE CONSOLE
        </span>
        <h1 className="text-base sm:text-xl font-black text-white">
          {match?.teamAName} VS {match?.teamBName}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-md transition cursor-pointer disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "💾 PUBLISH MATCH"}
        </button>
        <button
          onClick={onExit}
          className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-sky-200 transition cursor-pointer"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
