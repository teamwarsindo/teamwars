"use client";

import React, { useState } from "react";
import { PlayerLineupItem } from "../types";
import { ArchetypeQuotaBanner } from "./archetype-quota-banner";
import { RosterPickerModal, RosterOption } from "./roster-picker-modal";

interface EditorLineupProps {
  teamAName: string;
  teamBName: string;
  lineupA: PlayerLineupItem[];
  lineupB: PlayerLineupItem[];
  rosterA?: RosterOption[];
  rosterB?: RosterOption[];
  masterDecks?: string[];
  masterSkills?: string[];
  onChangeLineupA: (newLineup: PlayerLineupItem[]) => void;
  onChangeLineupB: (newLineup: PlayerLineupItem[]) => void;
}

const createEmptyPlayerSlot = (ign = "", idDuelLinks = ""): PlayerLineupItem => ({
  ign,
  idDuelLinks,
  remainingLife: 2,
  totalWins: 0,
  totalLosses: 0,
  deck1: { archetype: "", skill: "" },
  deck2: { archetype: "", skill: "" },
});

export function EditorLineup({
  teamAName,
  teamBName,
  lineupA = [],
  lineupB = [],
  rosterA = [],
  rosterB = [],
  masterDecks = [],
  masterSkills = [],
  onChangeLineupA,
  onChangeLineupB,
}: EditorLineupProps) {
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [activeDuelistIdx, setActiveDuelistIdx] = useState<number>(0);

  const isTeamA = activeTab === "A";
  const activeTeamName = isTeamA ? teamAName : teamBName;
  const currentLineup = isTeamA ? lineupA : lineupB;
  const currentRoster = isTeamA ? rosterA : rosterB;
  const updateCurrentLineup = isTeamA ? onChangeLineupA : onChangeLineupB;

  const validPlayersCount = currentLineup.filter(
    (p) => p && typeof p.ign === "string" && p.ign.trim() !== "" && p.ign.trim() !== "-"
  ).length;

  const handleToggleRosterPlayer = (player: RosterOption) => {
    const cleanPlayerIgn = (player.ign || "").trim().toLowerCase();
    const existingIndex = currentLineup.findIndex(
      (p) => (p?.ign || "").trim().toLowerCase() === cleanPlayerIgn && cleanPlayerIgn !== ""
    );

    if (existingIndex !== -1) {
      const updated = [...currentLineup];
      updated[existingIndex] = createEmptyPlayerSlot();
      updateCurrentLineup(updated);
    } else {
      const emptySlotIdx = currentLineup.findIndex(
        (p) => !p?.ign || p.ign.trim() === "" || p.ign.trim() === "-"
      );

      if (emptySlotIdx !== -1) {
        const updated = [...currentLineup];
        updated[emptySlotIdx] = {
          ...updated[emptySlotIdx],
          ign: player.ign,
          idDuelLinks: player.idDuelLinks || "",
        };
        updateCurrentLineup(updated);
      } else if (currentLineup.length < 5) {
        const updated = [
          ...currentLineup,
          createEmptyPlayerSlot(player.ign, player.idDuelLinks || ""),
        ];
        updateCurrentLineup(updated);
      }
    }
  };

  const handleUpdateActivePlayer = (field: string, value: any) => {
    const updated = [...currentLineup];
    while (updated.length <= activeDuelistIdx) {
      updated.push(createEmptyPlayerSlot());
    }

    const targetPlayer = { ...updated[activeDuelistIdx] };

    if (field === "ign") targetPlayer.ign = value;
    if (field === "idDuelLinks") targetPlayer.idDuelLinks = value;
    if (field === "deck1.archetype") {
      targetPlayer.deck1 = { ...targetPlayer.deck1, archetype: value };
    }
    if (field === "deck1.skill") {
      targetPlayer.deck1 = { ...targetPlayer.deck1, skill: value };
    }
    if (field === "deck2.archetype") {
      targetPlayer.deck2 = { ...targetPlayer.deck2, archetype: value };
    }
    if (field === "deck2.skill") {
      targetPlayer.deck2 = { ...targetPlayer.deck2, skill: value };
    }

    updated[activeDuelistIdx] = targetPlayer;
    updateCurrentLineup(updated);
  };

  const selectedDuelist = currentLineup[activeDuelistIdx] || createEmptyPlayerSlot();

  return (
    <div className="space-y-4">
      {/* TAB PILIHAN TIM */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => {
            setActiveTab("A");
            setActiveDuelistIdx(0);
          }}
          className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer ${
            isTeamA
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {teamAName || "Tim A"} ({lineupA.filter((p) => p.ign?.trim()).length}/5)
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("B");
            setActiveDuelistIdx(0);
          }}
          className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer ${
            !isTeamA
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {teamBName || "Tim B"} ({lineupB.filter((p) => p.ign?.trim()).length}/5)
        </button>
      </div>

      {/* TOMBOL BUKA/TUTUP MODAL ROSTER */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsRosterModalOpen((prev) => !prev)}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <span>👥</span>
          <span>
            {isRosterModalOpen
              ? "Tutup Pilihan Roster"
              : `Kelola Roster ${activeTeamName} (${validPlayersCount}/5)`}
          </span>
        </button>

        <RosterPickerModal
          isOpen={isRosterModalOpen}
          onClose={() => setIsRosterModalOpen(false)}
          teamName={activeTeamName}
          roster={currentRoster}
          lineup={currentLineup}
          onTogglePlayer={handleToggleRosterPlayer}
        />
      </div>

      {/* BANNER KUOTA ARCHETYPE TIM */}
      <ArchetypeQuotaBanner
        teamName={activeTeamName || "Tim"}
        lineup={currentLineup}
        masterArchetypes={masterDecks}
      />

      {/* NAVIGASI 5 SLOT DUELIST */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
          Pilih Duelist:
        </span>
        {[0, 1, 2, 3, 4].map((idx) => {
          const p = currentLineup[idx];
          const hasIgn = Boolean(p?.ign && p.ign.trim() !== "" && p.ign.trim() !== "-");
          const isActive = activeDuelistIdx === idx;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveDuelistIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-xs"
                  : hasIgn
                  ? "bg-white border-slate-300 text-slate-900 hover:border-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  : "bg-slate-100 border-dashed border-slate-300 text-slate-400 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-500"
              }`}
            >
              <span>#{idx + 1}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasIgn ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              {p?.ign && p.ign.trim() !== "" && p.ign.trim() !== "-" && (
                <span className="max-w-[70px] truncate">{p.ign}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* DETAIL DECK & SKILL DUELIST */}
      <div className="p-4 bg-white dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Slot Duelist #{activeDuelistIdx + 1}
            </span>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              {selectedDuelist.ign || "Nama Pemain Belum Dipilih"}
            </h4>
          </div>
          <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            DL ID: {selectedDuelist.idDuelLinks || "-"}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              In-Game Name (IGN)
            </label>
            <input
              type="text"
              value={selectedDuelist.ign || ""}
              onChange={(e) => handleUpdateActivePlayer("ign", e.target.value)}
              placeholder="Contoh: Floryn"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Duel Links ID
            </label>
            <input
              type="text"
              value={selectedDuelist.idDuelLinks || ""}
              onChange={(e) => handleUpdateActivePlayer("idDuelLinks", e.target.value)}
              placeholder="Contoh: 821-896-510"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* DECK 1 */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
              Deck 1
            </span>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Archetype
              </label>
              <input
                type="text"
                list="archetype-options"
                value={selectedDuelist.deck1?.archetype || ""}
                onChange={(e) => handleUpdateActivePlayer("deck1.archetype", e.target.value)}
                placeholder="Pilih atau ketik archetype..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Skill
              </label>
              <input
                type="text"
                list="skill-options"
                value={selectedDuelist.deck1?.skill || ""}
                onChange={(e) => handleUpdateActivePlayer("deck1.skill", e.target.value)}
                placeholder="Ketik skill karakter..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* DECK 2 */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
              Deck 2
            </span>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Archetype
              </label>
              <input
                type="text"
                list="archetype-options"
                value={selectedDuelist.deck2?.archetype || ""}
                onChange={(e) => handleUpdateActivePlayer("deck2.archetype", e.target.value)}
                placeholder="Pilih atau ketik archetype..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Skill
              </label>
              <input
                type="text"
                list="skill-options"
                value={selectedDuelist.deck2?.skill || ""}
                onChange={(e) => handleUpdateActivePlayer("deck2.skill", e.target.value)}
                placeholder="Ketik skill karakter..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <datalist id="archetype-options">
        {masterDecks.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="skill-options">
        {masterSkills.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
    }
          
