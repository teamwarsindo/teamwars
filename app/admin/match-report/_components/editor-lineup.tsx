'use client';

import { useState } from 'react';
import { PlayerLineupItem } from '../types';
import { RosterPickerModal, RosterOption } from './roster-picker-modal';
import { ArchetypeQuotaBanner } from './archetype-quota-banner';
import { DuelistDeckCard } from './duelist-deck-card';

interface EditorLineupProps {
  teamAName: string;
  teamBName: string;
  rosterA?: RosterOption[];
  rosterB?: RosterOption[];
  lineupA: PlayerLineupItem[];
  lineupB: PlayerLineupItem[];
  masterArchetypes?: string[];
  deckOptions: Array<{ label: string; val: string }>;
  skillOptions: Array<{ label: string; val: string; sub?: string }>;
  onUpdateLineup: (side: 'teamA' | 'teamB', updated: PlayerLineupItem[]) => void;
  onSyncNewDeck?: (newDeck: string) => Promise<void>;
  onSyncNewSkill?: (newSkill: string) => Promise<void>;
}

export function EditorLineup({
  teamAName,
  teamBName,
  rosterA = [],
  rosterB = [],
  lineupA = [],
  lineupB = [],
  masterArchetypes = [],
  deckOptions = [],
  skillOptions = [],
  onUpdateLineup,
  onSyncNewDeck,
  onSyncNewSkill,
}: EditorLineupProps) {
  // State Level 1: Pilih Tim yang sedang aktif (Tim A atau Tim B)
  const [activeSide, setActiveSide] = useState<'teamA' | 'teamB'>('teamA');

  // State Level 2: Index Duelist yang sedang aktif diedit (0-4)
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(0);

  // State Modal Tahap 1: Buka/Tutup Pemilihan 5 Roster
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  const currentTeamName = activeSide === 'teamA' ? teamAName : teamBName;
  const currentRoster = activeSide === 'teamA' ? rosterA : rosterB;
  const currentLineup = activeSide === 'teamA' ? lineupA : lineupB;

  // Pastikan index pemain tidak melebihi panjang lineup saat ini
  const safeIdx = Math.min(selectedPlayerIdx, Math.max(0, currentLineup.length - 1));
  const activeDuelist = currentLineup[safeIdx];

  // Handler: Toggle Pemain di Tahap 1 (Centang/Hapus dari 5 duelist)
  const handleTogglePlayer = (player: RosterOption) => {
    const exists = currentLineup.some(
      (p) => p.ign.toLowerCase() === player.ign.toLowerCase()
    );

    let updated: PlayerLineupItem[];
    if (exists) {
      updated = currentLineup.filter(
        (p) => p.ign.toLowerCase() !== player.ign.toLowerCase()
      );
    } else {
      if (currentLineup.length >= 5) return;
      updated = [
        ...currentLineup,
        {
          ign: player.ign,
          idDuelLinks: player.idDuelLinks || '',
          remainingLife: 2,
          totalWins: 0,
          totalLosses: 0,
          deck1: { archetype: '', skill: '' },
          deck2: { archetype: '', skill: '' },
        },
      ];
    }
    onUpdateLineup(activeSide, updated);
  };

  // Handler: Update Archetype atau Skill untuk Duelist aktif di Tahap 2
  const handleDeckChange = (
    field: 'archetype' | 'skill',
    val: string,
    slot: 'deck1' | 'deck2'
  ) => {
    if (!activeDuelist) return;
    const updated = [...currentLineup];
    const targetPlayer = { ...updated[safeIdx] };

    targetPlayer[slot] = {
      ...targetPlayer[slot],
      [field]: val,
    };

    updated[safeIdx] = targetPlayer;
    onUpdateLineup(activeSide, updated);
  };

  // Handler: Tambah Deck Baru ke Database & langsung pasang ke duelist
  const handleAddNewDeck = async (newVal: string, slot: 'deck1' | 'deck2') => {
    handleDeckChange('archetype', newVal, slot);
    if (onSyncNewDeck) await onSyncNewDeck(newVal);
  };

  // Handler: Tambah Skill Baru ke Database & langsung pasang ke duelist
  const handleAddNewSkill = async (newVal: string, slot: 'deck1' | 'deck2') => {
    handleDeckChange('skill', newVal, slot);
    if (onSyncNewSkill) await onSyncNewSkill(newVal);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* LEVEL 1: PILIH TIM (Tim A vs Tim B) & TOMBOL KELOLA ROSTER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 border border-border p-3 rounded-2xl">
        {/* Toggle Tim A / Tim B */}
        <div className="flex items-center gap-2 bg-background p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setActiveSide('teamA');
              setSelectedPlayerIdx(0);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${
              activeSide === 'teamA'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {teamAName} ({lineupA.length}/5)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSide('teamB');
              setSelectedPlayerIdx(0);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${
              activeSide === 'teamB'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {teamBName} ({lineupB.length}/5)
          </button>
        </div>

        {/* Tombol Buka Modal Tahap 1 */}
        <button
          type="button"
          onClick={() => setIsRosterModalOpen(!isRosterModalOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition"
        >
          <span>👥</span>
          <span>{isRosterModalOpen ? 'Tutup Pilihan Roster' : 'Kelola 5 Duelist'}</span>
        </button>
      </div>

      {/* TAHAP 1: MODAL/DRAWER MULTI-CHOICE CENTANG 5 PEMAIN */}
      <RosterPickerModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        teamName={currentTeamName}
        roster={currentRoster}
        lineup={currentLineup}
        onTogglePlayer={handleTogglePlayer}
      />

      {/* VALIDASI: BANNER KUOTA DUPLIKASI ARCHETYPE TIM (MAKS 5) */}
      <ArchetypeQuotaBanner
        lineup={currentLineup}
        masterArchetypes={masterArchetypes}
      />

      {/* ========================================================================= */}
      {/* LEVEL 2 & TAHAP 2: PILIH DUELIST & INPUT DECK 1 + DECK 2 */}
      {/* ========================================================================= */}
      {currentLineup.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
          Belum ada duelist yang dipilih untuk <strong className="text-foreground">{currentTeamName}</strong>.
          <br />
          Klik tombol <strong>&quot;Kelola 5 Duelist&quot;</strong> di atas untuk menentukan 5 pemain terlebih dahulu.
        </div>
      ) : (
        <div className="space-y-3">
          {/* LEVEL 2: DROPDOWN / TAB DUELIST */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground shrink-0 pr-1">
              Pilih Duelist:
            </span>
            {currentLineup.map((p, idx) => {
              const isActive = idx === safeIdx;
              const hasCompleteDecks = Boolean(
                p.deck1?.archetype && p.deck2?.archetype
              );

              return (
                <button
                  key={`${p.ign}-${idx}`}
                  type="button"
                  onClick={() => setSelectedPlayerIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition border ${
                    isActive
                      ? 'bg-foreground text-background border-foreground shadow-xs'
                      : 'bg-card border-border hover:border-primary/50 text-foreground'
                  }`}
                >
                  <span className="opacity-70 text-[10px]">#{idx + 1}</span>
                  <span>{p.ign}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasCompleteDecks ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* FORM DECK 1 & DECK 2 BERDAMPINGAN UNTUK DUELIST AKTIF */}
          {activeDuelist && (
            <DuelistDeckCard
              playerIndex={safeIdx}
              player={activeDuelist}
              deckOptions={deckOptions}
              skillOptions={skillOptions}
              onChange={handleDeckChange}
              onAddNewDeck={handleAddNewDeck}
              onAddNewSkill={handleAddNewSkill}
            />
          )}
        </div>
      )}
    </div>
  );
}
