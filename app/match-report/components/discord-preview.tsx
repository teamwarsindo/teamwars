"use client";

import { MatchItem, MatchReportEntry } from "../utils/lib-match-report";

interface DiscordPreviewProps {
  match: MatchItem;
  entry?: MatchReportEntry;
}

export function DiscordPreview({ match, entry }: DiscordPreviewProps) {
  const nowFormatted =
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    ", " +
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(":", ".") +
    " WIB";

  const renderTeamTitle = (team: any) => {
    if (team?.emojiId && team?.code) {
      return `<:${team.code}:${team.emojiId}> ${team.name}`;
    }
    return team?.name || "Team";
  };

  return (
    <div className="bg-[#313338] text-[#dbdee1] p-4 rounded-lg font-sans text-sm border-l-4 border-[#3b82f6] shadow-xl space-y-3">
      {/* HEADER UTAMA */}
      <div className="font-bold text-white text-base">
        {match.group.toUpperCase()} — WEEK {match.week}
      </div>

      {/* 🟢 LANGSUNG NAMA TIM VS TIM (SUB-JUDUL DIHAPUS) */}
      <div className="text-sm font-bold text-white">
        <span>{renderTeamTitle(match.teamA)}</span>
        <span className="mx-2 text-[#949ba4]">VS</span>
        <span>{renderTeamTitle(match.teamB)}</span>
      </div>

      {/* CATATAN MATCH */}
      <div className="space-y-1">
        <div className="font-semibold text-xs text-[#949ba4]">📝 Catatan Match:</div>
        <div className="text-xs bg-[#2b2d31] p-2 rounded border border-[#383a40]">
          {entry?.notes || "_Tidak ada catatan._"}
        </div>
      </div>

      {/* GAMBAR MATCH REPORT */}
      {entry?.imageUrl ? (
        <div className="rounded-md overflow-hidden border border-[#383a40] bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.imageUrl} alt="Match Report" className="w-full max-h-60 object-contain" />
        </div>
      ) : (
        <div className="h-28 border border-dashed border-[#4e5058] rounded-md flex items-center justify-center text-xs text-[#949ba4]">
          [ Tampilan Gambar Match Report ]
        </div>
      )}

      {/* FOOTER */}
      <div className="text-[11px] text-[#949ba4] border-t border-[#383a40] pt-2 flex items-center gap-1">
        🏆 TWI Season 7 • {nowFormatted}
      </div>
    </div>
  );
}