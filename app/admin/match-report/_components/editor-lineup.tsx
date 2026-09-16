'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { PlayerLineupItem } from '../types';
import { ArchetypeQuotaBanner } from './archetype-banner';
import { DuelistEditorForm } from './duelist-editor-form';
import { MetaAutocompleteOption } from './meta-autocomplete';
import { RosterModal, RosterOption } from './roster-modal';

export type { RosterOption };

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
  const [modalWarn, setModalWarn] = useState<string | null>(null);
  const [deckCache, setDeckCache] = useState<Record<string, { deck1: any; deck2: any }>>({});

  const currentTeamName = activeSide === 'A' ? teamAName : teamBName;
  const currentLineup = activeSide === 'A' ? teamALineup : teamBLineup;
  const currentRoster = activeSide === 'A' ? rosterA : rosterB;

  const deckOptions: MetaAutocompleteOption[] = useMemo(() => masterDecks.map((d) => ({ label: d, val: d })), [masterDecks]);
  const skillOptions: MetaAutocompleteOption[] = useMemo(() => masterSkills.map((s) => ({ label: s.label, val: s.name, sub: s.code })), [masterSkills]);

  const handleChangeDeck = useCallback((playerIdx: number, slot: 'deck1' | 'deck2', field: 'archetype' | 'skill', val: string) => {
    const active = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const updated = [...active];
    const target = { ...updated[playerIdx] };

    target[slot] = { ...(target[slot] || { archetype: '', skill: '' }), [field]: val };
    updated[playerIdx] = target;

    if (target.ign) {
      setDeckCache((prev) => ({ ...prev, [target.ign.toLowerCase()]: { deck1: target.deck1, deck2: target.deck2 } }));
    }
    onChangeLineup(activeSide, updated);
  }, [currentLineup, activeSide, onChangeLineup]);

  const handleToggleRoster = (player: RosterOption) => {
    setModalWarn(null);
    const active = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const exists = active.some((p) => p.ign.toLowerCase() === player.ign.toLowerCase());

    if (exists) {
      const found = active.find((p) => p.ign.toLowerCase() === player.ign.toLowerCase());
      if (found) setDeckCache((prev) => ({ ...prev, [player.ign.toLowerCase()]: { deck1: found.deck1, deck2: found.deck2 } }));
      onChangeLineup(activeSide, active.filter((p) => p.ign.toLowerCase() !== player.ign.toLowerCase()));
    } else {
      if (active.length >= 5) {
        setModalWarn('Maksimal 5 pemain per tim.');
        return;
      }
      const cached = deckCache[player.ign.toLowerCase()];
      const newP: PlayerLineupItem = {
        ign: player.ign, idDuelLinks: player.idDuelLinks || '', remainingLife: 2, totalWins: 0, totalLosses: 0,
        deck1: cached?.deck1 || { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
        deck2: cached?.deck2 || { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
      };
      onChangeLineup(activeSide, [...active, newP]);
    }
  };

  const audit = useMemo(() => {
    const active = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const pCount = active.length;
    let filled = 0;
    let missSkills = 0;

    active.forEach((p) => {
      if (p.deck1?.archetype?.trim() && p.deck1.archetype !== '-') { filled++; if (!p.deck1?.skill?.trim()) missSkills++; }
      if (p.deck2?.archetype?.trim() && p.deck2.archetype !== '-') { filled++; if (!p.deck2?.skill?.trim()) missSkills++; }
    });

    const totalDeckloss = 10 - filled;
    return { pCount, totalDeckloss, missSkills, isClean: pCount === 5 && totalDeckloss === 0 && missSkills === 0 };
  }, [currentLineup]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setActiveSide('A'); setModalWarn(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSide === 'A' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {teamAName}
          </button>
          <button
            type="button"
            onClick={() => { setActiveSide('B'); setModalWarn(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSide === 'B' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {teamBName}
          </button>
        </div>

        <button
          type="button"
          onClick={() => { setIsRosterModalOpen(true); setModalWarn(null); }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>📋</span>
          <span>Pilih 5 Pemain ({audit.pCount}/5)</span>
        </button>
      </div>

      {/* Peringatan Merah Ringkas & Seragam */}
      {!audit.isClean && (
        <div className="p-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-sm">⚠️</span>
            <span>
              {audit.totalDeckloss > 0 && <b>{audit.totalDeckloss} Deckloss </b>}
              {audit.pCount < 5 && `(${audit.pCount}/5 pemain)`}
              {audit.missSkills > 0 && <span className="opacity-90"> • {audit.missSkills} skill belum diisi</span>}
            </span>
          </div>
          <span className="text-[10px] font-mono opacity-60">Audit Lineup</span>
        </div>
      )}

      <ArchetypeQuotaBanner lineup={currentLineup} masterArchetypes={masterArchetypes} />

      <DuelistEditorForm
        lineup={currentLineup}
        deckOptions={deckOptions}
        skillOptions={skillOptions}
        onChangeDeck={handleChangeDeck}
        onRefreshMeta={onRefreshMeta}
      />

      <RosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        teamName={currentTeamName}
        roster={currentRoster}
        lineup={currentLineup}
        modalWarn={modalWarn}
        onClearWarn={() => setModalWarn(null)}
        onTogglePlayer={handleToggleRoster}
      />
    </div>
  );
}
