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

    return `${dateStr} • ${timeStr} WIB`;
  };

  return (
    <div className="relative border-b border-sky-400/30 pb-3">
      <button
        onClick={onClose}
        className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sky-200 hover:bg-rose-600 hover:text-white transition cursor-pointer font-bold text-xs z-10"
      >
        ✕
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-center text-xs">
        {/* STREAMER + LINK STREAMING */}
        <div className="bg-[#003875] p-2.5 rounded-xl border border-sky-400/30 flex flex-col items-center justify-center min-h-[60px]">
          <div className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">STREAMER</div>
          <div className="font-extrabold text-white truncate">{match.streamer || match.caster || "Belum Ditentukan"}</div>
          {match.streamLink ? (
            <a
              href={match.streamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold transition"
            >
              🔴 Watch Live Stream
            </a>
          ) : (
            <span className="text-[10px] text-sky-300/50 mt-0.5 italic">Belum Ada Link</span>
          )}
        </div>

        {/* WASIT / REFEREE */}
        <div className="bg-[#003875] p-2.5 rounded-xl border border-sky-400/30 flex flex-col items-center justify-center min-h-[60px]">
          <div className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">WASIT / REFEREE</div>
          <div className="font-extrabold text-white truncate">{match.referee || "Belum Ditentukan"}</div>
        </div>

        {/* JADWAL MATCH */}
        <div className="bg-[#003875] p-2.5 rounded-xl border border-sky-400/30 flex flex-col items-center justify-center min-h-[60px]">
          <div className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">WEEK {weekNumber}</div>
          <div className="text-[11px] font-bold text-amber-300 mt-0.5">
            {formatDateTime(match.matchDate)}
          </div>
        </div>
      </div>
    </div>
  );
}
