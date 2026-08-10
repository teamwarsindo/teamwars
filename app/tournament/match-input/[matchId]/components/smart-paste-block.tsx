"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export function SmartPasteBlock({
  rawText,
  setRawText,
  match,
  activeListA,
  activeListB,
  gameLogs,
  setGameLogs,
}: {
  rawText: string;
  setRawText: (v: string) => void;
  match: MatchScheduleItem | null;
  activeListA: string[];
  activeListB: string[];
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
}) {
  const handleParseText = () => {
    if (!rawText.trim() || !match) return;

    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const newLogs: GameDetailLog[] = [];

    lines.forEach((line) => {
      // Regex ekstraksi log Discord format: "PlayerA ArchetypeA 1 - 0 ArchetypeB PlayerB"
      const matchPattern = line.match(/(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)/);
      if (matchPattern) {
        const [, sideA, valA, , sideB] = matchPattern;
        const numA = parseInt(valA, 10);

        const partsA = sideA.split(" ");
        const playerA = partsA[0];
        const deckA = partsA.slice(1).join(" ") || "Archetype A";

        const partsB = sideB.split(" ");
        const deckB = partsB.slice(0, -1).join(" ") || "Archetype B";
        const playerB = partsB[partsB.length - 1];

        // Match dengan list pemain pilihan
        const matchedPlayerA = activeListA.find(
          (p) => p.toLowerCase().replace(/[^a-z0-9]/g, "") === playerA.toLowerCase().replace(/[^a-z0-9]/g, "")
        ) || playerA;

        const matchedPlayerB = activeListB.find(
          (p) => p.toLowerCase().replace(/[^a-z0-9]/g, "") === playerB.toLowerCase().replace(/[^a-z0-9]/g, "")
        ) || playerB;

        const isAWin = numA > 0;

        newLogs.push({
          gameNumber: gameLogs.length + newLogs.length + 1,
          playerAId: matchedPlayerA,
          playerAName: matchedPlayerA,
          deckA,
          skillA: "-",
          playerBId: matchedPlayerB,
          playerBName: matchedPlayerB,
          deckB,
          skillB: "-",
          winnerTeamId: isAWin ? match.teamAId : match.teamBId,
        });
      }
    });

    if (newLogs.length > 0) {
      setGameLogs([...gameLogs, ...newLogs]);
      setRawText("");
      Swal.fire({
        icon: "success",
        title: "Smart Paste Berhasil!",
        text: `${newLogs.length} game log berhasil diekstrak ke dalam tabel.`,
        toast: true,
        position: "top-end",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      Swal.fire("Format Tidak Cocok", "Gagal mengekstrak teks. Pastikan format log sesuai.", "warning");
    }
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
          ⚡ Smart Paste Discord Log Parser
        </h3>
        <span className="text-[10px] text-muted-foreground">Copy & Paste teks rekap dari Discord</span>
      </div>

      <textarea
        rows={3}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={`Paste rekap Discord di sini... Contoh:\nKaiba Blue-Eyes 1 - 0 HERO Yugi\nJoey Red-Eyes 0 - 1 Tachyon Mizar`}
        className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/40"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleParseText}
          disabled={!rawText.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-xs font-extrabold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
        >
          ⚡ Ekstrak Ke Tabel Log
        </button>
      </div>
    </section>
  );
}