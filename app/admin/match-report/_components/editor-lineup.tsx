'use client';

import { useState, useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { RosterPickerModal, RosterOption } from './roster-picker-modal';
import { ArchetypeQuotaBanner } from './archetype-quota-banner';
import { DuelistDeckCard } from './duelist-deck-card';

export interface EditorLineupProps {
  teamAName: string;
  teamBName: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  rosterA?: RosterOption[];
  rosterB?: RosterOption[];
  masterDecks?: string[];
  masterSkills?: Array<{ name: string; code?: string; label?: string }>;
  onChange?: (
    side: 'A' | 'B',
    idx: number,
    field: string,
    val: any,
    deckSlot?: 'deck1' | 'deck2'
  ) => void;
  onSelectRoster?: (side: 'A' | 'B', idx: number, ign: string, idDuelLinks?: string) => void;
  onUpdateLineup?: (side: 'teamA' | 'teamB', updated: PlayerLineupItem[]) => void;
  onSyncNewDeck?: (newDeck: string) => Promise<void>;
  onSyncNewSkill?: (newSkill: string) => Promise<void>;
}

export function EditorLineup({
  teamAName,
  teamBName,
  teamALineup = [],
  teamBLineup = [],
  rosterA = [],
  rosterB = [],
  masterDecks = [],
  masterSkills = [],
  onChange,
  onUpdateLineup,
  onSyncNewDeck,
  onSyncNewSkill,
}: EditorLineupProps) {
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState<number>(0);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  const currentTeamName = activeSide === 'A' ? teamAName : teamBName;
  const currentRoster = activeSide === 'A' ? rosterA : rosterB;
  const currentLineup = activeSide === 'A' ? teamALineup : teamBLineup;

  // Filter hanya slot yang berisi pemain valid
  const validPlayers = useMemo(
    () =>
      currentLineup.filter(
        (p) => p && typeof p.ign === 'string' && p.ign.trim() !== '' && p.ign.trim() !== '-'
      ),
    [currentLineup]
  );

  const safeIdx = Math.min(selectedPlayerIdx, Math.max(0, validPlayers.length - 1));
  const activeDuelist = validPlayers[safeIdx];

  const deckOptions = useMemo(
    () => masterDecks.map((d) => ({ label: d, val: d })),
    [masterDecks]
  );

  const skillOptions = useMemo(
    () =>
      masterSkills.map((s) => ({
        label: s.label || (s.code ? `${s.name} [${s.code}]` : s.name),
        val: s.name,
        sub: s.code || '',
      })),
    [masterSkills]
  );

  // Toggle Pemain di Modal Tahap 1
  const handleTogglePlayer = (player: RosterOption) => {
    const cleanPlayerIgn = (player.ign || '').trim().toLowerCase();
    const existsIdx = currentLineup.findIndex(
      (p) => (p?.ign || '').trim().toLowerCase() === cleanPlayerIgn && cleanPlayerIgn !== ''
    );

    let updated: PlayerLineupItem[];

    if (existsIdx !== -1) {
      // Uncheck pemain
      updated = currentLineup.filter((_, i) => i !== existsIdx);
      if (selectedPlayerIdx >= updated.length) {
        setSelectedPlayerIdx(Math.max(0, updated.length - 1));
      }
    } else {
      // Check pemain baru (maksimal 5 duelist)
      if (validPlayers.length >= 5) return;

      const newSlot: PlayerLineupItem = {
        ign: player.ign,
        idDuelLinks: player.idDuelLinks || '',
        remainingLife: 2,
        totalWins: 0,
        totalLosses: 0,
        deck1: { archetype: '', skill: '' },
        deck2: { archetype: '', skill: '' },
      };

      updated = [...validPlayers, newSlot];
    }

    if (onUpdateLineup) {
      onUpdateLineup(activeSide === 'A' ? 'teamA' : 'teamB', updated);
    }
  };

  // Update Archetype / Skill untuk Duelist Aktif
  const handleDeckChange = (
    field: 'archetype' | 'skill',
    val: string,
    slot: 'deck1' | 'deck2'
  ) => {
    if (onChange) {
      onChange(activeSide, safeIdx, field, val, slot);
    } else if (onUpdateLineup) {
      const updated = [...currentLineup];
      if (updated[safeIdx]) {
        updated[safeIdx] = {
          ...updated[safeIdx],
          [slot]: {
            ...updated[safeIdx]?.[slot],
            [field]: val,
          },
        };
        onUpdateLineup(activeSide === 'A' ? 'teamA' : 'teamB', updated);
      }
    }
  };

  const handleAddNewDeck = async (newVal: string, slot: 'deck1' | 'deck2') => {
    handleDeckChange('archetype', newVal, slot);
    if (onSyncNewDeck) await onSyncNewDeck(newVal);
  };

  const handleAddNewSkill = async (newVal: string, slot: 'deck1' | 'deck2') => {
    handleDeckChange('skill', newVal, slot);
    if (onSyncNewSkill) await onSyncNewSkill(newVal);
  };

  return (
    <div className="space-y-4">
      {/* LEVEL 1: PILIH TIM (A vs B) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 border border-border p-3 rounded-2xl">
        <div className="flex items-center gap-2 bg-background p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setActiveSide('A');
              setSelectedPlayerIdx(0);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              activeSide === 'A'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {teamAName} ({teamALineup.filter((p) => p.ign?.trim()).length}/5)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSide('B');
              setSelectedPlayerIdx(0);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              activeSide === 'B'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {teamBName} ({teamBLineup.filter((p) => p.ign?.trim()).length}/5)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsRosterModalOpen(!isRosterModalOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
        >
          <span>👥</span>
          <span>{isRosterModalOpen ? 'Tutup Pilihan Roster' : `Kelola 5 Duelist (${validPlayers.length}/5)`}</span>
        </button>
      </div>

      {/* TAHAP 1: MODAL ROSTER */}
      <RosterPickerModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        teamName={currentTeamName}
        roster={currentRoster}
        lineup={currentLineup}
        onTogglePlayer={handleTogglePlayer}
      />

      {/* BANNER KUOTA ARCHETYPE TIM */}
      <ArchetypeQuotaBanner
        lineup={currentLineup}
        masterArchetypes={masterDecks}
      />

      {/* LEVEL 2: PILIH DUELIST & FORM DUA DECK */}
      {validPlayers.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
          Belum ada duelist yang dipilih untuk <strong className="text-foreground">{currentTeamName}</strong>.
          <br />
          Klik tombol <strong>&quot;Kelola 5 Duelist&quot;</strong> di atas untuk menentukan pemain.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground shrink-0 pr-1">
              Pilih Duelist:
            </span>
            {validPlayers.map((p, idx) => {
              const isActive = idx === safeIdx;
              const hasCompleteDecks = Boolean(p.deck1?.archetype && p.deck2?.archetype);

              return (
                <button
                  key={`${p.ign}-${idx}`}
                  type="button"
                  onClick={() => setSelectedPlayerIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition border cursor-pointer ${
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
