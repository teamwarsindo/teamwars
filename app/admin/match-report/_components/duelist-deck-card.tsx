'use client';

import React, { useState, useRef, useEffect } from 'react';
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

interface PopoverSelectProps {
  value: string;
  options: OptionItem[];
  placeholder: string;
  emptyLabel: string;
  disabled?: boolean;
  disabledLabel?: string;
  hasError?: boolean;
  onSelect: (val: string) => void;
}

function PopoverSelect({
  value,
  options,
  placeholder,
  emptyLabel,
  disabled = false,
  disabledLabel = '-- Tidak Dapat Diisi --',
  hasError = false,
  onSelect,
}: PopoverSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (disabled) {
    return (
      <div className="w-full px-3 py-2 rounded-xl text-xs bg-muted/40 border border-border/50 text-muted-foreground/60 cursor-not-allowed">
        {disabledLabel}
      </div>
    );
  }

  const selectedItem = options.find((o) => o.val === value);
  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.val.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearch('');
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs bg-background border transition shadow-2xs text-left ${
          hasError
            ? 'border-rose-500 bg-rose-500/5 text-foreground'
            : 'border-border hover:border-primary/60 text-foreground'
        }`}
      >
        <span className="truncate font-medium">
          {selectedItem ? selectedItem.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full max-h-64 rounded-xl border border-border bg-card/95 backdrop-blur-md p-1.5 shadow-xl flex flex-col space-y-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-1 pt-1 pb-0.5">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="overflow-y-auto max-h-48 space-y-0.5 pr-0.5">
            <button
              type="button"
              onClick={() => {
                onSelect('');
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/70 transition"
            >
              {emptyLabel}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">
                Tidak ada data ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.val === value;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      onSelect(opt.val);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition truncate ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-foreground hover:bg-muted/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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

        {/* Custom Dropdown Archetype */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground">Archetype Deck</label>
          <PopoverSelect
            value={archetypeVal}
            options={deckOptions}
            placeholder="-- Pilih Archetype Deck --"
            emptyLabel="-- Kosongkan Deck (Deckloss) --"
            onSelect={handleArchetypeSelect}
          />
        </div>

        {/* Custom Dropdown Skill */}
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

          <PopoverSelect
            value={skillVal}
            options={skillOptions}
            placeholder="-- Pilih Skill Karakter --"
            emptyLabel="-- Kosongkan Skill --"
            disabled={!hasArchetype}
            disabledLabel="-- Tidak Dapat Diisi --"
            hasError={isMissingSkill}
            onSelect={(val) => onChange('skill', val, slot)}
          />
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
