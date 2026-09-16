'use client';

import React from 'react';
import { PlayerLineupItem } from '../types';

interface OptionItem {
  label: string;
  val: string;
  sub?: string;
}

interface DuelistDeckCardProps {
  playerIndex: number;
  player: PlayerLineupItem;
  deckOptions: OptionItem[];
  skillOptions: OptionItem[];
  onChange: (field: 'archetype' | 'skill', val: string, slot: 'deck1' | 'deck2') => void;
  onAddNewDeck?: (val: string, slot: 'deck1' | 'deck2') => Promise<void>;
  onAddNewSkill?: (val: string, slot: 'deck1' | 'deck2') => Promise<void>;
}

export function DuelistDeckCard({
  playerIndex,
  player,
  deckOptions,
  skillOptions,
  onChange,
}: DuelistDeckCardProps) {
  const renderDeckSlot = (slot: 'deck1' | 'deck2', slotLabel: string) => {
    const deckData = player[slot] || { archetype: '', skill: '' };
    const archetypeVal = deckData.archetype || '';
    const skillVal = deckData.skill || '';

    const hasArchetype = Boolean(archetypeVal.trim());
    const isMissingSkill = hasArchetype && !skillVal.trim();

    const handleArchetypeSelect = (val: string) => {
      onChange('archetype', val, slot);
      // Jika deck dikosongkan, otomatis hapus skill agar tidak tertinggal
      if (!val.trim()) {
        onChange('skill', '', slot);
      }
    };

    return (
      <div
        className={`p-3.5 rounded-2xl border transition ${
          isMissingSkill
            ? 'border-rose-500/50 bg-rose-500/5'
            : hasArchetype
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-border bg-card'
        } space-y-3`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            {slotLabel}
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              !hasArchetype
                ? 'bg-muted text-muted-foreground'
                : isMissingSkill
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {!hasArchetype ? 'Deck Kosong (Deckloss)' : isMissingSkill ? 'Wajib Isi Skill' : 'Lengkap'}
          </span>
        </div>

        {/* Input Archetype */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground">Archetype Deck</label>
          <select
            value={archetypeVal}
            onChange={(e) => handleArchetypeSelect(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-background border border-border focus:border-primary focus:outline-hidden font-medium text-foreground"
          >
            <option value="">-- Kosongkan Deck (Deckloss) --</option>
            {deckOptions.map((opt) => (
              <option key={opt.val} value={opt.val}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Input Skill (Disabled jika Deck Kosong) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              className={`text-[11px] font-bold ${
                !hasArchetype
                  ? 'text-muted-foreground/40'
                  : isMissingSkill
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              }`}
            >
              Skill Karakter {hasArchetype && <span className="text-rose-500">*</span>}
            </label>
            {!hasArchetype && (
              <span className="text-[10px] text-muted-foreground/60 italic">Kunci (Isi deck dulu)</span>
            )}
          </div>

          <select
            value={skillVal}
            disabled={!hasArchetype}
            onChange={(e) => onChange('skill', e.target.value, slot)}
            className={`w-full px-3 py-2 rounded-xl text-xs bg-background border font-medium text-foreground transition ${
              !hasArchetype
                ? 'opacity-40 cursor-not-allowed bg-muted border-border'
                : isMissingSkill
                ? 'border-rose-500 focus:border-rose-600 bg-rose-500/5'
                : 'border-border focus:border-primary'
            } focus:outline-hidden`}
          >
            <option value="">
              {!hasArchetype ? '-- Tidak Dapat Diisi --' : '-- Pilih Skill Karakter --'}
            </option>
            {skillOptions.map((opt) => (
              <option key={opt.val} value={opt.val}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center">
            {playerIndex + 1}
          </span>
          <span className="text-sm font-black text-foreground">{player.ign}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">ID: {player.idDuelLinks || '-'}</span>
          <span>•</span>
          <span className="font-medium">Life: {player.remainingLife ?? 2}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderDeckSlot('deck1', 'Deck 1')}
        {renderDeckSlot('deck2', 'Deck 2')}
      </div>
    </div>
  );
}
