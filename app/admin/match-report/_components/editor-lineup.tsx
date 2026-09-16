'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { PlayerLineupItem } from '../types';
import { ArchetypeQuotaBanner } from './archetype-banner';
import { DuelistEditorForm } from './duelist-editor-form';
import { MetaAutocompleteOption } from './meta-autocomplete';

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

interface EditorLineupProps {
  teamAName: string;
  teamBName: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  rosterA: RosterOption[];
  rosterB: RosterOption[];
  masterDecks: string[];
  masterSkills: Array<{ name: string; label: string; code?: string }>;
  masterArchetypes: string[];
  onChangeLineup: (side: 'A' | 'B', newLineup: PlayerLineupItem[]) => void;
  onRefreshMeta?: () => Promise<void>;
}

export function EditorLineup({
  teamAName,
  teamBName,
  teamALineup,
  teamBLineup,
  rosterA,
  rosterB,
  masterDecks,
  masterSkills,
  masterArchetypes,
  onChangeLineup,
  onRefreshMeta,
}: EditorLineupProps) {
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  // Cache deck terikat IGN agar saat uncheck dan check kembali susunan deck tidak hilang
  const [deckCache, setDeckCache] = useState<Record<string, { deck1: any; deck2: any }>>({});

  const currentTeamName = activeSide === 'A' ? teamAName : teamBName;
  const currentLineup = activeSide === 'A' ? teamALineup : teamBLineup;
  const currentRoster = activeSide === 'A' ? rosterA : rosterB;

  // Pastikan selalu ada 5 slot array di form
  const normalizedSlots = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentLineup[i] || {
      ign: '', idDuelLinks: '', remainingLife: 2, totalWins: 0, totalLosses: 0,
      deck1: { archetype: '', skill: '' }, deck2: { archetype: '', skill: '' },
    });
  }, [currentLineup]);

  const deckOptions: MetaAutocompleteOption[] = useMemo(() => masterDecks.map((d) => ({ label: d, val: d })), [masterDecks]);
  const skillOptions: MetaAutocompleteOption[] = useMemo(() => masterSkills.map((s) => ({ label: s.label, val: s.name, sub: s.code })), [masterSkills]);

  // Handler Edit Deck/Skill
  const handleChangeDeck = useCallback((playerIdx: number, slot: 'deck1' | 'deck2', field: 'archetype' | 'skill', val: string) => {
    const updated = [...normalizedSlots];
    const targetPlayer = { ...updated[playerIdx] };
    targetPlayer[slot] = { ...(targetPlayer[slot] || { archetype: '', skill: '' }), [field]: val };
    updated[playerIdx] = targetPlayer;

    if (targetPlayer.ign) {
      setDeckCache((prev) => ({
        ...prev,
        [targetPlayer.ign.toLowerCase()]: { deck1: targetPlayer.deck1, deck2: targetPlayer.deck2 },
      }));
    }

    onChangeLineup(activeSide, updated);
  }, [normalizedSlots, activeSide, onChangeLineup]);

  // Handler Centang Roster (Maksimal 5)
  const handleToggleRoster = (player: RosterOption) => {
    const existsIdx = normalizedSlots.findIndex((p) => p.ign.toLowerCase() === player.ign.toLowerCase());
    let nextList: PlayerLineupItem[] = [];

    if (existsIdx !== -1) {
      // Uncheck: Hapus dari daftar
      nextList = normalizedSlots.filter((_, i) => i !== existsIdx);
    } else {
      // Check: Ambil dari cache jika pemain pernah diisi sebelumnya
      const activeCount = normalizedSlots.filter((p) => Boolean(p.ign)).length;
      if (activeCount >= 5) {
        alert('Maksimal 5 pemain per tim!');
        return;
      }
      const cached = deckCache[player.ign.toLowerCase()];
      const newPlayer: PlayerLineupItem = {
        ign: player.ign,
        idDuelLinks: player.idDuelLinks || '',
        remainingLife: 2,
        totalWins: 0,
        totalLosses: 0,
        deck1: cached?.deck1 || { archetype: '', skill: '' },
        deck2: cached?.deck2 || { archetype: '', skill: '' },
      };
      nextList = [...normalizedSlots.filter((p) => Boolean(p.ign)), newPlayer];
    }

    onChangeLineup(activeSide, nextList);
  };

  // Audit Deckloss & Missing Skill
  const audit = useMemo(() => {
    let missingDecks = 0;
    let missingSkills = 0;
    normalizedSlots.forEach((p) => {
      if (!p.ign) {
        missingDecks += 2;
      } else {
        if (!p.deck1?.archetype?.trim() || p.deck1.archetype === '-') missingDecks++;
        else if (!p.deck1?.skill?.trim()) missingSkills++;

        if (!p.deck2?.archetype?.trim() || p.deck2.archetype === '-') missingDecks++;
        else if (!p.deck2?.skill?.trim()) missingSkills++;
      }
    });
    return { missingDecks, missingSkills, isClean: missingDecks === 0 && missingSkills === 0 };
  }, [normalizedSlots]);

  return (
    <div className="space-y-4">
      {/* 1. Baris Pemilihan Tim A vs Tim B & Tombol Modal Roster */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSide('A')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition ${
              activeSide === 'A' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {teamAName} (Kubu A)
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('B')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition ${
              activeSide === 'B' ? 'bg-rose-500 text-white shadow-xs' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {teamBName} (Kubu B)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsRosterModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>📋</span>
          <span>Pilih 5 Pemain ({normalizedSlots.filter((p) => Boolean(p.ign)).length}/5)</span>
        </button>
      </div>

      {/* 2. Banner Audit Deckloss & Missing Skill */}
      {!audit.isClean && (
        <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {audit.missingDecks > 0 && `Total ${audit.missingDecks} Deckloss (Slot Kosong). `}
              {audit.missingSkills > 0 && `${audit.missingSkills} Deck belum memiliki Skill.`}
            </span>
          </div>
          <span className="text-[10px] font-mono opacity-70">Audit Lineup</span>
        </div>
      )}

      {/* 3. Banner Kuota Duplikasi 5 Deck Tim */}
      <ArchetypeQuotaBanner lineup={normalizedSlots} masterArchetypes={masterArchetypes} />

      {/* 4. Formulir Input Deck & Skill 5 Pemain */}
      <DuelistEditorForm
        lineup={normalizedSlots}
        deckOptions={deckOptions}
        skillOptions={skillOptions}
        onChangeDeck={handleChangeDeck}
        onRefreshMeta={onRefreshMeta}
      />

      {/* 5. Modal Roster Picker */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-black uppercase text-foreground">Roster {currentTeamName}</span>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 p-1">
              {currentRoster.map((p, idx) => {
                const isSelected = normalizedSlots.some((s) => s.ign.toLowerCase() === p.ign.toLowerCase());
                return (
                  <button
                    key={`${p.ign}-${idx}`}
                    type="button"
                    onClick={() => handleToggleRoster(p)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                      isSelected ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/50 bg-muted/20 hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.isReleased ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      <span className="truncate">{p.ign}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{p.idDuelLinks || '-'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
