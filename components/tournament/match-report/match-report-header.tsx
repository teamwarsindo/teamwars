"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function MatchReportHeader({
  match,
  weekNumber,
  onClose,
}: {
  match: MatchScheduleItem;
  weekNumber: number;
  onClose: () => void;
}) {
  const formatDateTime = (isoString: string) => {
    if (!isoString) return "TBA";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "TBA";

    const dateStr = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    const timeStr = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).replace(".", ":");

    return `${dateStr}, ${timeStr} WIB`;
  };

  return (
    <div className="relative border-b border-sky-400/40 pb-3">
      <button
        onClick={onClose}
        className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sky-200 hover:bg-rose-600 hover:text-white transition cursor-pointer font-bold text-xs z-10"
      >
        ✕
      </button>

      <div className="grid grid-cols-3 gap-2 items-center text-center text-xs">
        {/* Streamer Info */}
        <div className="text-left sm:text-center">
          <div className="font-bold text-white text-xs sm:text-sm truncate">
            {match.streamer || match.caster || "Belum Ditentukan"}
          </div>
          {match.streamLink ? (
            <a
              href={match.streamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-sky-200 opacity-90 hover:text-amber-300 underline transition truncate block max-w-[160px] mx-auto"
            >
              {match.streamLink.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <span className="text-[10px] text-sky-300/50 block">Belum Ada Link</span>
          )}
        </div>

        {/* Referee / Wasit */}
        <div>
          <div className="text-[10px] uppercase text-sky-300 tracking-wider font-semibold">REFEREE</div>
          <div className="font-bold text-white text-xs sm:text-sm truncate">
            {match.referee || "Belum Ditentukan"}
          </div>
        </div>

        {/* Group Name + Week + Match Time */}
        <div className="text-right sm:text-center">
          <div className="font-bold text-white text-xs sm:text-sm">
            {match.groupName || "Group"} • Week {weekNumber}
          </div>
          <div className="text-[10px] text-sky-200 opacity-90">
            {formatDateTime(match.matchDate)}
          </div>
        </div>
      </div>
    </div>
  );
    }
