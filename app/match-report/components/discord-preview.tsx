"use client";

import { MatchItem, MatchReportEntry, maskImageUrl, generateFileName } from "../utils/lib-match-report";

interface DiscordPreviewProps {
  match: MatchItem;
  entry?: MatchReportEntry;
}

export function DiscordPreview({ match, entry }: DiscordPreviewProps) {
  const fileName = generateFileName(match);
  const maskedUrl = maskImageUrl(entry?.imageUrl || "", fileName);
  const nowFormatted = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + ` at ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

  return (
    <div className="bg-[#313338] text-[#dbdee1] p-4 rounded-lg font-sans text-sm border-l-4 border-[#3b82f6] shadow-xl space-y-3">
      {/* Title */}
      <div className="font-bold text-white text-base">
        {match.group.toUpperCase()} — WEEK {match.week}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="font-semibold text-white">⚔️ Match Report #{match.matchNumber}</div>
        <div>
          {match.teamA.emoji} <strong>{match.teamA.name}</strong> &nbsp;VS&nbsp; {match.teamB.emoji} <strong>{match.teamB.name}</strong>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <div className="font-semibold text-xs text-[#949ba4]">📝 Catatan Match:</div>
        <div className="text-xs bg-[#2b2d31] p-2 rounded border border-[#383a40]">
          {entry?.notes || "_Tidak ada catatan._"}
        </div>
      </div>

      {/* Main Image */}
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

      {/* Footer */}
      <div className="text-[11px] text-[#949ba4] border-t border-[#383a40] pt-2 flex items-center gap-1">
        🏆 TWI Season 7 • {nowFormatted}
      </div>
    </div>
  );
}