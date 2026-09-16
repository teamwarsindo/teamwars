"use client";

import { PlayerLineupItem } from "../types";

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

interface RosterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  roster: RosterOption[];
  lineup: PlayerLineupItem[];
  onTogglePlayer: (player: RosterOption) => void;
}

export function RosterPickerModal({
  isOpen,
  onClose,
  teamName,
  roster = [],
  lineup = [],
  onTogglePlayer,
}: RosterPickerModalProps) {
  if (!isOpen) return null;

  // Hitung hanya yang memiliki IGN valid
  const validSelected = lineup.filter(
    (p) => p && typeof p.ign === "string" && p.ign.trim() !== "" && p.ign.trim() !== "-"
  );
  const selectedCount = validSelected.length;
  const isFull = selectedCount >= 5;

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl space-y-4 shadow-md">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wide">
            Kelola 5 Duelist: <span className="text-blue-600 dark:text-blue-400">{teamName}</span>
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            Centang duelist yang akan bertanding di match ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-black px-3 py-1 rounded-lg border ${
              isFull
                ? "bg-emerald-100 border-emerald-400 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-500/50 dark:text-emerald-300"
                : "bg-amber-100 border-amber-400 text-amber-950 dark:bg-amber-950/60 dark:border-amber-500/50 dark:text-amber-300"
            }`}
          >
            {selectedCount} / 5 Duelist Terpilih
          </span>
        </div>
      </div>

      {/* Grid Pemain */}
      {roster.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Daftar roster tim ini belum tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {roster.map((player, idx) => {
            const cleanPlayerIgn = (player.ign || "").trim().toLowerCase();
            const isSelected = lineup.some(
              (p) => (p?.ign || "").trim().toLowerCase() === cleanPlayerIgn && cleanPlayerIgn !== ""
            );

            return (
              <button
                key={`${player.ign}-${idx}`}
                type="button"
                onClick={() => {
                  if (!isSelected && isFull) {
                    alert(
                      "Lineup sudah penuh (5 pemain). Klik pemain yang sudah terpilih untuk meng-uncheck sebelum memilih pemain lain."
                    );
                    return;
                  }
                  onTogglePlayer(player);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                  isSelected
                    ? "bg-blue-50 border-blue-600 text-blue-950 dark:bg-blue-950/60 dark:border-blue-400 dark:text-blue-100 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                }`}
              >
                {/* Sisi Kiri: Dot status & IGN */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      player.isReleased ? "bg-rose-600 dark:bg-rose-500" : "bg-emerald-600 dark:bg-emerald-400"
                    }`}
                  />
                  <span className="truncate font-black tracking-tight text-slate-900 dark:text-white">
                    {player.ign}
                  </span>
                </div>

                {/* Sisi Kanan: ID DL & Checkbox */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                    {player.idDuelLinks || "-"}
                  </span>
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border transition ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                        : "border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer Tombol Tutup */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2.5 px-4 font-black text-xs rounded-xl transition cursor-pointer ${
            isFull
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              : "bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700"
          }`}
        >
          {isFull ? "Simpan 5 Duelist & Lanjut Atur Deck / Skill" : "Tutup Pilihan Roster"}
        </button>
      </div>
    </div>
  );
}
