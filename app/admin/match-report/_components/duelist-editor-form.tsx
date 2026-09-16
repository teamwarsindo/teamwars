'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PlayerLineupItem } from '../types';

export interface MetaAutocompleteOption {
  label: string;
  val: string;
  sub?: string;
}

// -------------------------------------------------------------
// A. Autocomplete Dropdown + Trigger Tambah ke Master KV
// -------------------------------------------------------------
function MetaAutocompleteDropdown({
  value,
  placeholder,
  options,
  type,
  disabled = false,
  hasError = false,
  onSelect,
  onRefreshMeta,
}: {
  value: string;
  placeholder: string;
  options: MetaAutocompleteOption[];
  type: 'deck' | 'skill';
  disabled?: boolean;
  hasError?: boolean;
  onSelect: (val: string) => void;
  onRefreshMeta?: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(value || '');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 30);
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.val.toLowerCase().includes(q)).slice(0, 30);
  }, [options, query]);

  const exactMatch = options.some((o) => o.val.toLowerCase() === query.trim().toLowerCase());
  const canAdd = query.trim().length >= 2 && !exactMatch;

  const handleAddNewToKV = async () => {
    const newName = query.trim();
    if (!newName) return;

    let skillCode = '';
    if (type === 'skill') {
      const inputCode = prompt(`Masukkan singkatan/kode untuk skill "${newName}" (opsional, contoh: IR):`);
      if (inputCode === null) return;
      skillCode = inputCode.trim().toUpperCase();
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/match-report/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name: newName, code: skillCode }),
      });
      const json = await res.json();
      if (json.success) {
        onSelect(newName);
        setIsOpen(false);
        if (onRefreshMeta) await onRefreshMeta();
      } else {
        alert(`Gagal menyimpan: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error network: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <div className="w-full px-3 py-2 rounded-xl text-xs bg-muted/40 border border-border/50 text-muted-foreground/60 cursor-not-allowed">
        -- Terkunci (Isi Archetype Dahulu) --
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={ref}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        className={`w-full px-3 py-2 rounded-xl text-xs bg-background border transition shadow-2xs focus:outline-hidden ${
          hasError ? 'border-rose-500 bg-rose-500/5 text-foreground' : 'border-border focus:border-primary text-foreground'
        }`}
      />

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1.5 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          {canAdd && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAddNewToKV}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-left cursor-pointer"
            >
              <span>➕</span>
              <span className="truncate">{isSubmitting ? 'Menyimpan...' : `Simpan "${query.trim()}" ke Master KV`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { onSelect(''); setQuery(''); setIsOpen(false); }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/70 transition cursor-pointer"
          >
            {type === 'deck' ? '-- Kosongkan (Deckloss) --' : '-- Kosongkan Skill --'}
          </button>

          {filtered.map((opt, i) => (
            <button
              key={`${opt.val}-${i}`}
              type="button"
              onClick={() => { onSelect(opt.val); setQuery(opt.val); setIsOpen(false); }}
              className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                value && opt.val.toLowerCase() === value.toLowerCase()
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-muted/60 text-foreground'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.sub && <span className="text-[10px] font-mono opacity-60 shrink-0">{opt.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// B. Formulir Kartu Deck 1 & 2 + Tab Navigasi 5 Pemain
// -------------------------------------------------------------
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
  const [activeTab, setActiveTab] = useState(0);
  const current = lineup[activeTab] || { ign: '', idDuelLinks: '', deck1: { archetype: '', skill: '' }, deck2: { archetype: '', skill: '' } };

  const getTabStatus = (p?: PlayerLineupItem) => {
    if (!p || !p.ign) return 'empty';
    const d1Ok = Boolean(p.deck1?.archetype?.trim() && p.deck1?.skill?.trim());
    const d2Ok = Boolean(p.deck2?.archetype?.trim() && p.deck2?.skill?.trim());
    if (d1Ok && d2Ok) return 'complete';
    if (p.deck1?.archetype?.trim() || p.deck2?.archetype?.trim()) return 'partial';
    return 'empty';
  };

  const renderSlot = (slot: 'deck1' | 'deck2', label: string) => {
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

  return (
    <div className="space-y-4">
      {/* Tab Navigasi 5 Pemain (Grid 3 di atas, 2 di bawah) */}
      <div className="grid grid-cols-6 gap-2">
        {lineup.slice(0, 5).map((p, idx) => {
          const status = getTabStatus(p);
          const isSelected = activeTab === idx;
          const colSpan = idx < 3 ? 'col-span-2' : 'col-span-3';

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`${colSpan} flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition ${
                isSelected ? 'border-primary bg-primary/10 text-primary shadow-2xs' : 'border-border bg-card/60 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0">{idx + 1}</span>
                <span className="truncate">{p.ign || '(Belum Dipilih)'}</span>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'complete' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Kartu Formulir Deck 1 & Deck 2 Pemain Terpilih */}
      <div className="p-4 rounded-2xl border border-border bg-card/70 space-y-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
              {activeTab + 1}
            </span>
            <span className="text-sm font-black text-foreground">{current.ign || 'Pemain Belum Dipilih'}</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">ID: {current.idDuelLinks || '-'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {renderSlot('deck1', 'Deck 1')}
          {renderSlot('deck2', 'Deck 2')}
        </div>
      </div>
    </div>
  );
}
