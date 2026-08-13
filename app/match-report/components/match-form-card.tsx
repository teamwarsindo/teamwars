"use client";

import { MatchItem, MatchReportEntry, generateFileName } from "../utils/lib-match-report";

interface MatchFormCardProps {
  match: MatchItem;
  entry?: MatchReportEntry;
  onUpload: (file: File) => void;
  onNotesChange: (notes: string) => void;
}

export function MatchFormCard({ match, entry, onUpload, onNotesChange }: MatchFormCardProps) {
  const fileName = generateFileName(match);

  return (
    <div className="glass glow-border rounded-2xl border p-5 sm:p-6 space-y-4">
      {/* Match Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Match #{match.matchNumber} — {match.group}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{fileName}</span>
      </div>

      {/* Versus Display */}
      <div className="flex items-center justify-center gap-3 text-base sm:text-lg font-extrabold">
        <span>{match.teamA.emoji} {match.teamA.name}</span>
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">VS</span>
        <span>{match.teamB.emoji} {match.teamB.name}</span>
      </div>

      {/* Upload Box */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Upload Image Report</label>
        {entry?.imageUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-black/20 p-2 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt="Match Report" className="max-h-48 object-contain rounded-lg" />
            <label className="mt-2 cursor-pointer text-xs text-primary underline">
              Ganti Gambar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
            <span className="text-xs text-muted-foreground">
              {entry?.isUploading ? "Mengunggah ke Cloudinary..." : "Klik atau seret gambar ke sini"}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={entry?.isUploading}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
          </label>
        )}
      </div>

      {/* Notes Input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Catatan Match</label>
        <textarea
          rows={2}
          value={entry?.notes || ""}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Tulis catatan singkat pertandingan..."
          className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
    </div>
  );
}