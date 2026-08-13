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
  const isUploading = Boolean(entry?.isUploading);

  return (
    <div className="glass glow-border rounded-2xl border p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Match #{match.matchNumber} — {match.group}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{fileName}</span>
      </div>

      <div className="flex items-center justify-center gap-3 text-base sm:text-lg font-extrabold">
        <span>{match.teamA.emoji} {match.teamA.name}</span>
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">VS</span>
        <span>{match.teamB.emoji} {match.teamB.name}</span>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Upload Image Report</label>

        {entry?.imageUrl && !isUploading ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-black/20 p-2 flex flex-col items-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt="Match Report" className="max-h-48 object-contain rounded-lg" />
            <label className="cursor-pointer text-xs font-semibold text-primary underline hover:text-primary/80">
              Ganti Gambar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
            </label>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl transition-all ${
              isUploading
                ? "border-primary/50 bg-primary/5 cursor-wait opacity-75"
                : "border-border hover:border-primary/50 cursor-pointer bg-muted/20"
            }`}
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="text-xs font-semibold text-primary">Mengunggah ke Cloudinary...</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Klik atau seret gambar ke sini</span>
            )}

            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        )}
      </div>

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