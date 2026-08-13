"use client";

import { MatchItem, MatchReportEntry, generateFileName, maskImageUrl } from "../utils/lib-match-report";

interface MatchFormCardProps {
  match: MatchItem;
  entry?: MatchReportEntry;
  onUpload: (file: File) => void;
  onNotesChange: (notes: string) => void;
}

export function MatchFormCard({ match, entry, onUpload, onNotesChange }: MatchFormCardProps) {
  const fileName = generateFileName(match);
  const maskedUrl = entry?.imageUrl ? maskImageUrl(entry.imageUrl, fileName) : null;

  return (
    <div className="glass glow-border rounded-2xl border p-4 sm:p-6 space-y-4">
      {/* HEADER ATAS: KIRI (MATCH ID), KANAN (GROUP) */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <span className="text-xs font-black uppercase tracking-wider text-primary">
          MATCH #{match.matchNumber}
        </span>
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          {match.group}
        </span>
      </div>

      {/* MATCH DISPLAY: LOGO SELALU DI KIRI NAMA TIM (1 BARIS MOBILE FRIENDLY) */}
      <div className="grid grid-cols-7 items-center gap-1 sm:gap-2 py-1 text-center">
        {/* TIM A (KIRI) */}
        <div className="col-span-3 flex items-center justify-start sm:justify-end gap-1.5 min-w-0">
          <img
            src={match.teamALogo || match.teamA.logo || "/logo.webp"}
            alt={match.teamA.name}
            className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 object-contain rounded-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/logo.webp";
            }}
          />
          <span className="font-extrabold text-[11px] sm:text-sm text-foreground truncate text-left leading-tight">
            {match.teamA.name}
          </span>
        </div>

        {/* SKOR TENGAH */}
        <div className="col-span-1 flex justify-center px-0.5">
          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl bg-primary text-primary-foreground font-black text-[10px] sm:text-xs shadow-xs whitespace-nowrap">
            {match.scoreA ?? 0} - {match.scoreB ?? 0}
          </span>
        </div>

        {/* TIM B (KANAN) */}
        <div className="col-span-3 flex items-center justify-start gap-1.5 min-w-0">
          <img
            src={match.teamBLogo || match.teamB.logo || "/logo.webp"}
            alt={match.teamB.name}
            className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 object-contain rounded-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/logo.webp";
            }}
          />
          <span className="font-extrabold text-[11px] sm:text-sm text-foreground truncate text-left leading-tight">
            {match.teamB.name}
          </span>
        </div>
      </div>

      {/* UPLOAD BOX */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground block">Upload Image Report</label>

        {entry?.imageUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-black/20 p-3 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt="Match Report" className="max-h-52 object-contain rounded-lg" />
            <label className="mt-2.5 cursor-pointer text-xs font-bold text-primary underline hover:text-primary/80 transition-colors">
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
          <label className="flex flex-col items-center justify-center h-32 sm:h-36 border-2 border-dashed border-border/80 rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/20 hover:bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">
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

        {/* 🟢 NAMA FILE MASKING BISA DIKLIK JIKA SUDAH ADA GAMBAR */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-muted-foreground/80 px-1 pt-1">
          <span>Target File Masking:</span>
          {entry?.imageUrl && maskedUrl ? (
            <a
              href={entry.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Buka gambar: ${maskedUrl}`}
              className="font-bold text-primary underline hover:text-primary/80 transition-all truncate max-w-[180px] sm:max-w-none cursor-pointer animate-pulse"
            >
              {fileName}.png 🔗
            </a>
          ) : (
            <span className="font-bold text-muted-foreground/60 truncate max-w-[180px] sm:max-w-none">
              {fileName}.png
            </span>
          )}
        </div>
      </div>

      {/* CATATAN MATCH */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Catatan Match</label>
        <textarea
          rows={2}
          value={entry?.notes || ""}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Tulis catatan singkat pertandingan..."
          className="w-full rounded-xl border border-border bg-background p-2.5 sm:p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>
    </div>
  );
      }
