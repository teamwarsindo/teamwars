'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { MetaAutocompleteDropdown, MetaAutocompleteOption } from './meta-autocomplete';

interface DuelistEditorFormProps {
  lineup: PlayerLineupItem[];
  deckOptions: MetaAutocompleteOption[];
  skillOptions: MetaAutocompleteOption[];
  onChangeDeck: (playerIdx: number, slot: 'deck1' | 'deck2', field: 'archetype' | 'skill', val: string) => void;
  onRefreshMeta?: () => Promise<void>;
}

export function DuelistEditorForm({
  lineup,
  deckOptions,
  skillOptions,
  onChangeDeck,
  onRefreshMeta,
}: DuelistEditorFormProps) {
  const activePlayers = useMemo(() => lineup.filter((p) => Boolean(p.ign?.trim())), [lineup]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (activeTab >= activePlayers.length) {
      setActiveTab(Math.max(0, activePlayers.length - 1));
    }
  }, [activePlayers.length, activeTab]);

  const current = activePlayers[activeTab];

  const getTabStatus = (p?: PlayerLineupItem) => {
    if (!p || !p.ign) return 'empty';
    const d1Ok = Boolean(p.deck1?.archetype?.trim() && p.deck1?.skill?.trim());
    const d2Ok = Boolean(p.deck2?.archetype?.trim() && p.deck2?.skill?.trim());
    if (d1Ok && d2Ok) return 'complete';
    if (p.deck1?.archetype?.trim() || p.deck2?.archetype?.trim()) return 'partial';
    return 'empty';
  };

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
          <span className="text-xs font-black uppercase tracking-wider text-foreground">{label}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
            !hasArch ? 'bg-muted text-muted-foreground' : isMissingSkill ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {!hasArch ? 'Deckloss' : isMissingSkill ? 'Wajib Skill' : 'Lengkap'}
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground">Archetype</label>
          <MetaAutocompleteDropdown
            value={arch}
            placeholder="-- Ketik / Pilih Deck --"
            options={deckOptions}
            type="deck"
            onSelect={(v) => {
              onChangeDeck(activeTab, slot, 'archetype', v);
              if (!v.trim()) onChangeDeck(activeTab, slot, 'skill', '');
            }}
            onRefreshMeta={onRefreshMeta}
          />
        </div>

        <div className="space-y-1">
          <label className={`text-[11px] font-bold ${isMissingSkill ? 'text-rose-400' : 'text-muted-foreground'}`}>
            Skill Karakter {hasArch && <span className="text-rose-500">*</span>}
          </label>
          <MetaAutocompleteDropdown
            value={skl}
            placeholder="-- Ketik / Pilih Skill --"
            options={skillOptions}
            type="skill"
            disabled={!hasArch}
            hasError={isMissingSkill}
            onSelect={(v) => onChangeDeck(activeTab, slot, 'skill', v)}
            onRefreshMeta={onRefreshMeta}
          />
        </div>
      </div>
    );
  };

  if (activePlayers.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-1">
        <p className="text-xs font-bold text-foreground">Belum ada duelist yang dipilih</p>
        <p className="text-[11px] text-muted-foreground">Pilih pemain melalui menu di atas terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 2 Baris: 3 tombol di atas (span 2), 2 tombol di bawah (span 3) */}
      <div className="grid grid-cols-6 gap-2">
        {activePlayers.map((p, idx) => {
          const status = getTabStatus(p);
          const isSelected = activeTab === idx;
          const colClass = activePlayers.length <= 3 
            ? 'col-span-2' 
            : idx < 3 ? 'col-span-2' : 'col-span-3';

          return (
            <button
              key={p.ign}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`${colClass} flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isSelected ? 'border-primary bg-primary/10 text-primary shadow-2xs' : 'border-border bg-card/60 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0 font-mono">
                  {idx + 1}
                </span>
                <span className="truncate">{p.ign}</span>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ml-1.5 ${
                status === 'complete' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </button>
          );
        })}
      </div>

      {current && (
        <div className="p-4 rounded-2xl border border-border bg-card/70 space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                {activeTab + 1}
              </span>
              <span className="text-sm font-black text-foreground">{current.ign}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">ID: {current.idDuelLinks || '-'}</span>
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
