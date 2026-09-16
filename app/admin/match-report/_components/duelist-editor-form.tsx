'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { MetaAutocompleteDropdown, MetaAutocompleteOption } from './meta-autocomplete';

interface DuelistEditorFormProps {
  lineup: PlayerLineupItem[];
  deckOptions: MetaAutocompleteOption[];
  skillOptions: MetaAutocompleteOption[];
  onChangeDeck: (ign: string, slot: 'deck1' | 'deck2', field: 'archetype' | 'skill', val: string) => void;
  onRefreshMeta?: () => Promise<void>;
}

export function DuelistEditorForm({
  lineup,
  deckOptions,
  skillOptions,
  onChangeDeck,
  onRefreshMeta,
}: DuelistEditorFormProps) {
  // Hitung berapa deck valid (Archetype + Skill terisi)
  const getDeckCount = (p?: PlayerLineupItem) => {
    if (!p) return 0;
    let count = 0;
    if (p.deck1?.archetype?.trim() && p.deck1.archetype !== '-' && p.deck1?.skill?.trim()) count++;
    if (p.deck2?.archetype?.trim() && p.deck2.archetype !== '-' && p.deck2?.skill?.trim()) count++;
    return count;
  };

  // SORTING LINEUP: Kelengkapan Deck (2/2 -> 1/2 -> 0/2) lalu Abjad (A-Z)
  const sortedPlayers = useMemo(() => {
    const active = lineup.filter((p) => Boolean(p.ign?.trim()));
    return [...active].sort((a, b) => {
      const diffDeck = getDeckCount(b) - getDeckCount(a);
      if (diffDeck !== 0) return diffDeck;
      return a.ign.localeCompare(b.ign, undefined, { sensitivity: 'base' });
    });
  }, [lineup]);

  const [selectedIgn, setSelectedIgn] = useState<string>('');

  useEffect(() => {
    if (sortedPlayers.length > 0) {
      const exists = sortedPlayers.some((p) => p.ign.toLowerCase() === selectedIgn.toLowerCase());
      if (!exists) {
        setSelectedIgn(sortedPlayers[0].ign);
      }
    } else {
      setSelectedIgn('');
    }
  }, [sortedPlayers, selectedIgn]);

  const current = sortedPlayers.find((p) => p.ign.toLowerCase() === selectedIgn.toLowerCase()) || sortedPlayers[0];

  const renderSlot = (slot: 'deck1' | 'deck2', label: string) => {
    if (!current) return null;
    const d = current[slot] || { archetype: '', skill: '' };
    const arch = d.archetype || '';
    const skl = d.skill || '';
    const hasArch = Boolean(arch.trim() && arch.trim() !== '-');
    const isMissingSkill = hasArch && !skl.trim();

    return (
      <div className={`p-3.5 rounded-2xl border transition space-y-3 ${
        isMissingSkill ? 'border-rose-500/50 bg-rose-500/5' : hasArch ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
            !hasArch ? 'bg-muted text-muted-foreground' : isMissingSkill ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            {!hasArch ? 'Deckloss' : isMissingSkill ? 'Wajib Skill' : 'Lengkap'}
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Archetype</label>
          <MetaAutocompleteDropdown
            value={arch}
            placeholder="-- Ketik / Pilih Deck --"
            options={deckOptions}
            type="deck"
            onSelect={(v) => {
              onChangeDeck(current.ign, slot, 'archetype', v);
              if (!v.trim()) onChangeDeck(current.ign, slot, 'skill', '');
            }}
            onRefreshMeta={onRefreshMeta}
          />
        </div>

        <div className="space-y-1">
          <label className={`text-xs font-semibold ${isMissingSkill ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
            Skill Karakter {hasArch && <span className="text-rose-500">*</span>}
          </label>
          <MetaAutocompleteDropdown
            value={skl}
            placeholder="-- Ketik / Pilih Skill --"
            options={skillOptions}
            type="skill"
            disabled={!hasArch}
            hasError={isMissingSkill}
            onSelect={(v) => onChangeDeck(current.ign, slot, 'skill', v)}
            onRefreshMeta={onRefreshMeta}
          />
        </div>
      </div>
    );
  };

  if (sortedPlayers.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-1">
        <p className="text-xs font-bold text-foreground">Belum ada duelist yang dipilih</p>
        <p className="text-xs text-muted-foreground">Pilih pemain melalui menu di atas terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 2 Pemain per baris, lebar sama, font diseragamkan */}
      <div className="grid grid-cols-2 gap-2">
        {sortedPlayers.map((p, idx) => {
          const filled = getDeckCount(p);
          const isSelected = current?.ign.toLowerCase() === p.ign.toLowerCase();

          return (
            <button
              key={p.ign}
              type="button"
              onClick={() => setSelectedIgn(p.ign)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isSelected 
                  ? 'border-primary bg-primary/10 text-primary shadow-xs' 
                  : 'border-border bg-card text-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs shrink-0 text-muted-foreground font-semibold">
                  {idx + 1}
                </span>
                <span className="truncate">{p.ign}</span>
              </div>
              
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ml-1.5 ${
                filled === 2 
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                  : filled === 1 
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}>
                🃏 {filled}/2
              </span>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="p-4 rounded-2xl border border-border bg-card/70 space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {sortedPlayers.findIndex((p) => p.ign === current.ign) + 1}
              </span>
              <span className="text-sm font-bold text-foreground">{current.ign}</span>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">ID: {current.idDuelLinks || '-'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderSlot('deck1', 'Deck 1')}
            {renderSlot('deck2', 'Deck 2')}
          </div>
        </div>
      )}
    </div>
  );
}
