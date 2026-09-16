'use client';

import { useState, useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { RosterPickerModal, RosterOption } from './roster-picker-modal';
import { ArchetypeQuotaBanner } from './archetype-quota-banner';
import { DuelistDeckCard } from './duelist-deck-card';
import { LineupAuditBanner } from './lineup-audit-banner';
import { DuelistSelectorTabs } from './duelist-selector-tabs';

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
  onSelectRoster,
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

  // Normalisasi array fixed 5 slot murni tanpa circular JSON
  const emitLineup = (validList: PlayerLineupItem[]) => {
    const active = validList
      .filter((p) => p && typeof p.ign === 'string' && p.ign.trim() !== '' && p.ign.trim() !== '-')
      .slice(0, 5);

    const normalized5Slots: PlayerLineupItem[] = Array.from({ length: 5 }, (_, i) => {
      if (active[i]) {
        const hasD1 = Boolean(active[i].deck1?.archetype?.trim());
        const hasD2 = Boolean(active[i].deck2?.archetype?.trim());

        return {
          ign: String(active[i].ign || ''),
          idDuelLinks: String(active[i].idDuelLinks || ''),
          remainingLife: Number(active[i].remainingLife ?? 2),
          totalWins: Number(active[i].totalWins ?? 0),
          totalLosses: Number(active[i].totalLosses ?? 0),
          deck1: {
            archetype: String(active[i].deck1?.archetype || ''),
            skill: hasD1 ? String(active[i].deck1?.skill || '') : '',
          },
          deck2: {
            archetype: String(active[i].deck2?.archetype || ''),
            skill: hasD2 ? String(active[i].deck2?.skill || '') : '',
          },
        };
      }
      return {
        ign: '',
        idDuelLinks: '',
        remainingLife: 2,
        totalWins: 0,
        totalLosses: 0,
        deck1: { archetype: '', skill: '' },
        deck2: { archetype: '', skill: '' },
      };
    });

    const sideKey = activeSide === 'A' ? 'teamA' : 'teamB';
    if (onUpdateLineup) onUpdateLineup(sideKey, normalized5Slots);

    if (onSelectRoster) {
      for (let i = 0; i < 5; i++) {
        onSelectRoster(activeSide, i, normalized5Slots[i].ign, normalized5Slots[i].idDuelLinks);
      }
    }
  };

  const handleTogglePlayer = (player: RosterOption) => {
    const cleanPlayerIgn = (player.ign || '').trim().toLowerCase();
    const currentValid = currentLineup.filter(
      (p) => p && typeof p.ign === 'string' && p.ign.trim() !== '' && p.ign.trim() !== '-'
    );

    const existsIdx = currentValid.findIndex(
      (p) => (p.ign || '').trim().toLowerCase() === cleanPlayerIgn
    );

    let nextValidList: PlayerLineupItem[];

    if (existsIdx !== -1) {
      nextValidList = currentValid.filter((_, i) => i !== existsIdx);
      if (selectedPlayerIdx >= nextValidList.length) {
        setSelectedPlayerIdx(Math.max(0, nextValidList.length - 1));
      }
    } else {
      if (currentValid.length >= 5) return;
      nextValidList = [
        ...currentValid,
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

    emitLineup(nextValidList);
  };

  const handleDeckChange = (field: 'archetype' | 'skill', val: string, slot: 'deck1' | 'deck2') => {
    if (onChange) {
      onChange(activeSide, safeIdx, field, val, slot);
    } else if (onUpdateLineup) {
      const updated = currentLineup.map((p, i) => {
        if (i !== safeIdx) return p;
        const currentSlot = p[slot] || { archetype: '', skill: '' };
        let newArchetype = field === 'archetype' ? val : currentSlot.archetype;
        let newSkill = field === 'skill' ? val : currentSlot.skill;

        if (!newArchetype?.trim()) newSkill = '';

        return {
          ...p,
          [slot]: { archetype: newArchetype, skill: newSkill },
        };
      });
      emitLineup(updated);
    }
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
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeSide === 'A'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="truncate max-w-[120px] inline-block align-bottom">{teamAName}</span>{' '}
            <span className="font-mono text-[11px] opacity-80 font-bold">
              {teamALineup.filter((p) => p?.ign?.trim()).length}/5
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSide('B');
              setSelectedPlayerIdx(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeSide === 'B'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="truncate max-w-[120px] inline-block align-bottom">{teamBName}</span>{' '}
            <span className="font-mono text-[11px] opacity-80 font-bold">
              {teamBLineup.filter((p) => p?.ign?.trim()).length}/5
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsRosterModalOpen(!isRosterModalOpen)}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
        >
          <span>👥</span>
          <span>{isRosterModalOpen ? 'Tutup Pilihan Roster' : 'Kelola 5 Duelist'}</span>
        </button>
      </div>

      {/* SUB-KOMPONEN 1: AUDIT LINEUP & PERINGATAN DECKLOSS */}
      <LineupAuditBanner teamName={currentTeamName} validPlayers={validPlayers} />

      {/* MODAL ROSTER */}
      <RosterPickerModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        teamName={currentTeamName}
        roster={currentRoster}
        lineup={currentLineup}
        onTogglePlayer={handleTogglePlayer}
      />

      {/* BANNER KUOTA ARCHETYPE */}
      <ArchetypeQuotaBanner lineup={currentLineup} masterArchetypes={masterDecks} />

      {/* LEVEL 2: DAFTAR DUELIST & FORM DECK */}
      {validPlayers.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
          Belum ada duelist yang dipilih untuk <strong className="text-foreground">{currentTeamName}</strong>.
          <br />
          Klik tombol <strong>&quot;Kelola 5 Duelist&quot;</strong> di atas untuk menentukan pemain.
        </div>
      ) : (
        <div className="space-y-3">
          {/* SUB-KOMPONEN 2: TAB PILIH DUELIST */}
          <DuelistSelectorTabs
            players={validPlayers}
            selectedIndex={safeIdx}
            onSelectIndex={setSelectedPlayerIdx}
          />

          {activeDuelist && (
            <DuelistDeckCard
              playerIndex={safeIdx}
              player={activeDuelist}
              deckOptions={deckOptions}
              skillOptions={skillOptions}
              onChange={handleDeckChange}
              onAddNewDeck={async (val, slot) => {
                handleDeckChange('archetype', val, slot);
                if (onSyncNewDeck) await onSyncNewDeck(val);
              }}
              onAddNewSkill={async (val, slot) => {
                handleDeckChange('skill', val, slot);
                if (onSyncNewSkill) await onSyncNewSkill(val);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
          }
