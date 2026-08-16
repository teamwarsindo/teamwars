"use client";

import { useState } from "react";
import { MatchScheduleItem, GameDetailLog, PlayerDeckInfo } from "@/lib/tournament";
import { Plus, Lock, Unlock } from "lucide-react";
import Swal from "sweetalert2";
import { TeamRosterColumn } from "./team-roster-column";
import { TOURNAMENT_CONFIG } from "../../constants/tournament";

interface Section2LineupProps {
  match: MatchScheduleItem;
  lineupA: PlayerDeckInfo[];
  setLineupA: (v: PlayerDeckInfo[]) => void;
  lineupB: PlayerDeckInfo[];
  setLineupB: (v: PlayerDeckInfo[]) => void;
  dbRosterA: Array<{ id: string; name: string; ign?: string; duellinksId?: string }>;
  dbRosterB: Array<{ id: string; name: string; ign?: string; duellinksId?: string }>;
  masterDecks: string[];
  masterSkills: string[];
  lateDecksA: number;
  lateDecksB: number;
  onAddMasterItem: (type: "DECK" | "SKILL", newItem: string) => Promise<void>;
  onSaveLineupToKV: () => Promise<void>;
  isLineupLocked: boolean;
  setIsLineupLocked: (v: boolean) => void;
  gameLogs?: GameDetailLog[];
  setGameLogs?: (v: GameDetailLog[]) => void;
}

export function Section2Lineup({
  match,
  lineupA,
  setLineupA,
  lineupB,
  setLineupB,
  dbRosterA,
  dbRosterB,
  masterDecks,
  masterSkills,
  lateDecksA,
  lateDecksB,
  onAddMasterItem,
  onSaveLineupToKV,
  isLineupLocked,
  setIsLineupLocked,
  gameLogs = [],
  setGameLogs,
}: Section2LineupProps) {
  const [isSavingLineup, setIsSavingLineup] = useState(false);

  // Hitung batas maksimal centang pemain berdasarkan Penalti Late Submit
  const maxPlayersA = Math.max(1, TOURNAMENT_CONFIG.MAX_ROSTER_SIZE - Math.floor(lateDecksA / 2));
  const maxPlayersB = Math.max(1, TOURNAMENT_CONFIG.MAX_ROSTER_SIZE - Math.floor(lateDecksB / 2));

  const isCompleteA =
    lineupA.length > 0 && lineupA.every((p) => p.deck1 && p.skill1 && p.deck2 && p.skill2);
  const isCompleteB =
    lineupB.length > 0 && lineupB.every((p) => p.deck1 && p.skill1 && p.deck2 && p.skill2);
  const isFormValid = isCompleteA && isCompleteB;

  const handlePromptAddMaster = async (type: "DECK" | "SKILL") => {
    if (isLineupLocked) return;
    const { value: text } = await Swal.fire({
      title: `Tambah Master ${type === "DECK" ? "Deck" : "Skill"}`,
      input: "text",
      inputPlaceholder: `Nama ${type === "DECK" ? "Deck" : "Skill"}...`,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      confirmButtonColor: "#9333ea",
    });
    if (text?.trim()) await onAddMasterItem(type, text.trim());
  };

  const handleToggleLockLineup = async () => {
    if (!isLineupLocked) {
      if (!isFormValid) {
        Swal.fire(
          "Peringatan",
          "Setiap pemain yang dicentang WAJIB melengkapi Deck 1, Skill 1, Deck 2, dan Skill 2!",
          "warning"
        );
        return;
      }

      // Hitung Auto-TL dari Roster Kurang + Penalti Late Submit
      const totalTlA = (TOURNAMENT_CONFIG.MAX_ROSTER_SIZE - lineupA.length) * TOURNAMENT_CONFIG.DECKS_PER_PLAYER + lateDecksA;
      const totalTlB = (TOURNAMENT_CONFIG.MAX_ROSTER_SIZE - lineupB.length) * TOURNAMENT_CONFIG.DECKS_PER_PLAYER + lateDecksB;

      if (totalTlA > 0 || totalTlB > 0) {
        const confirm = await Swal.fire({
          title: "Konfirmasi Auto Technical Loss",
          html: `
            <div class="text-left text-xs space-y-2">
              <p>Sistem akan meng-generate Hukuman Auto-TL ke Log Game:</p>
              <ul class="list-disc pl-4 font-bold text-rose-500">
                <li>${match.teamAName}: ${totalTlA} Game Auto-TL</li>
                <li>${match.teamBName}: ${totalTlB} Game Auto-TL</li>
              </ul>
            </div>
          `,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Ya, Lock & Generate Log TL",
          confirmButtonColor: "#9333ea",
        });

        if (!confirm.isConfirmed) return;

        if (setGameLogs) {
          const autoLogs: GameDetailLog[] = [];
          let gameNum = 1;

          for (let i = 0; i < totalTlA; i++) {
            autoLogs.push({
              gameNumber: gameNum++,
              playerAId: "-",
              playerAName: "-",
              deckA: "Line-up kurang / Penalti",
              skillA: "",
              playerBId: "-",
              playerBName: "-",
              deckB: "Technical Win",
              skillB: "",
              winnerTeamId: match.teamBId,
              isTLA: true,
              isTLB: false,
            });
          }

          for (let i = 0; i < totalTlB; i++) {
            autoLogs.push({
              gameNumber: gameNum++,
              playerAId: "-",
              playerAName: "-",
              deckA: "Technical Win",
              skillA: "",
              playerBId: "-",
              playerBName: "-",
              deckB: "Line-up kurang / Penalti",
              skillB: "",
              winnerTeamId: match.teamAId,
              isTLA: false,
              isTLB: true,
            });
          }

          setGameLogs([...autoLogs, ...gameLogs]);
        }
      }

      setIsSavingLineup(true);
      try {
        await onSaveLineupToKV();
        setIsLineupLocked(true);
        localStorage.setItem(`lineup_locked_${match.id}`, "true");
      } catch {
        Swal.fire("Gagal", "Gagal menyimpan lineup ke server", "error");
      } finally {
        setIsSavingLineup(false);
      }
    } else {
      setIsLineupLocked(false);
      localStorage.removeItem(`lineup_locked_${match.id}`);
    }
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">2. Lineup Bertanding</h3>
          {isLineupLocked && (
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isLineupLocked}
            onClick={() => handlePromptAddMaster("DECK")}
            className="px-2.5 py-1.5 rounded-xl border border-primary/40 text-primary text-[11px] font-bold cursor-pointer hover:bg-primary/10 disabled:opacity-40"
          >
            <Plus className="h-3 w-3 inline mr-1" />
            Deck
          </button>
          <button
            type="button"
            disabled={isLineupLocked}
            onClick={() => handlePromptAddMaster("SKILL")}
            className="px-2.5 py-1.5 rounded-xl border border-primary/40 text-primary text-[11px] font-bold cursor-pointer hover:bg-primary/10 disabled:opacity-40"
          >
            <Plus className="h-3 w-3 inline mr-1" />
            Skill
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TeamRosterColumn
          teamName={match.teamAName}
          teamLogo={match.teamALogo}
          lineup={lineupA}
          setLineup={setLineupA}
          dbRoster={dbRosterA}
          masterDecks={masterDecks}
          masterSkills={masterSkills}
          isLocked={isLineupLocked}
          maxSelectablePlayers={maxPlayersA}
        />
        <TeamRosterColumn
          teamName={match.teamBName}
          teamLogo={match.teamBLogo}
          lineup={lineupB}
          setLineup={setLineupB}
          dbRoster={dbRosterB}
          masterDecks={masterDecks}
          masterSkills={masterSkills}
          isLocked={isLineupLocked}
          maxSelectablePlayers={maxPlayersB}
        />
      </div>

      <button
        type="button"
        disabled={isSavingLineup || (!isLineupLocked && !isFormValid)}
        onClick={handleToggleLockLineup}
        className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 ${
          isLineupLocked
            ? "bg-amber-600 hover:bg-amber-500 text-white"
            : "bg-emerald-600 hover:bg-emerald-500 text-white"
        }`}
      >
        {isLineupLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <span>
          {isSavingLineup
            ? "Menyimpan..."
            : isLineupLocked
            ? "✏️ EDIT LINEUP"
            : isFormValid
            ? "🔒 LOCK LINEUP"
            : "🔒 Lengkapi Deck & Skill Pemain Terpilih"}
        </span>
      </button>
    </section>
  );
}