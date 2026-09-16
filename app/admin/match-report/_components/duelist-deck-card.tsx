'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { MetaAutocompleteDropdown } from './meta-autocomplete';

interface DuelistDeckCardProps {
  playerIndex: number;
  player: PlayerLineupItem;
  deckOptions: Array<{ label: string; val: string }>;
  skillOptions: Array<{ label: string; val: string; sub?: string }>;
  onChange: (field: 'archetype' | 'skill', val: string, slot: 'deck1' | 'deck2') => void;
  onAddNewDeck: (val: string, slot: 'deck1' | 'deck2') => void;
  onAddNewSkill: (val: string, slot: 'deck1' | 'deck2') => void;
}

export function DuelistDeckCard({
  playerIndex,
  player,
  deckOptions,
  skillOptions,
  onChange,
  onAddNewDeck,
  onAddNewSkill,
}: DuelistDeckCardProps) {
  const d1Arch = player.deck1?.archetype?.trim().toLowerCase();
  const d2Arch = player.deck2?.archetype?.trim().toLowerCase();

  // Validasi: 1 Pemain dilarang menggunakan Archetype yang sama persis
  const isSameDeckError = useMemo(() => {
    return Boolean(d1Arch && d2Arch && d1Arch === d2Arch && d1Arch !== '-');
  }, [d1Arch, d2Arch]);

  return (
    <div className="p-4 rounded-2xl border border-border bg-card space-y-3.5 shadow-xs">
      {/* Header Duelist & ID */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center shrink-0">
            {playerIndex + 1}
          </span>
          <span className="font-black text-sm text-foreground truncate">
            {player.ign}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border border-border">
            ID: {player.idDuelLinks || '-'}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded-lg border border-border">
            Life: {player.remainingLife ?? 2}
          </span>
        </div>
      </div>

      {/* Peringatan Bentrok Archetype Pemain */}
      {isSameDeckError && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>Deck 1 dan Deck 2 pada duelist yang sama dilarang menggunakan archetype yang sama!</span>
        </div>
      )}

      {/* Form Dua Deck (Berdampingan di Desktop / Menumpuk Rapi di HP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {(['deck1', 'deck2'] as const).map((slot, sIdx) => {
          const slotLabel = sIdx === 0 ? 'Deck 1' : 'Deck 2';
          const deckData = player[slot] || { archetype: '', skill: '' };

          return (
            <div
              key={slot}
              className={`p-3 rounded-xl border space-y-2.5 bg-background transition-all ${
                isSameDeckError ? 'border-rose-500/60' : 'border-border/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                  {slotLabel}
                </span>
                {deckData.archetype && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Terisi
                  </span>
                )}
              </div>

              {/* Input Archetype */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Archetype
                </label>
                <MetaAutocompleteDropdown
                  value={deckData.archetype || ''}
                  placeholder={`Pilih / Ketik Archetype ${slotLabel}...`}
                  options={deckOptions}
                  onSelect={(val) => onChange('archetype', val, slot)}
                  onAddNew={(val) => onAddNewDeck(val, slot)}
                />
              </div>

              {/* Input Skill (Skill boleh sama antar Deck 1 & Deck 2) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Skill
                </label>
                <MetaAutocompleteDropdown
                  value={deckData.skill || ''}
                  placeholder={`Pilih / Ketik Skill ${slotLabel}...`}
                  options={skillOptions}
                  onSelect={(val) => onChange('skill', val, slot)}
                  onAddNew={(val) => onAddNewSkill(val, slot)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
                }
