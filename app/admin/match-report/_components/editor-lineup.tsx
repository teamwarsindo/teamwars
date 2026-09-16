'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { extractArchetypesFromDeck } from '@/lib/discord/commands/submit/archetype';

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

interface EditorLineupProps {
  teamAName?: string;
  teamBName?: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  rosterA: RosterOption[];
  rosterB: RosterOption[];
  masterDecks: string[];
  masterSkills: Array<{ name: string; label: string; code?: string }>;
  masterArchetypes?: string[];
  onChange: (side: 'A' | 'B', idx: number, field: string, val: any, deckSlot?: 'deck1' | 'deck2') => void;
  onSelectRoster: (side: 'A' | 'B', idx: number, ign: string) => void;
  onAddNewDeck?: (newDeck: string) => void;
  onAddNewSkill?: (newSkill: { name: string; label: string; code?: string }) => void;
}

// -------------------------------------------------------------
// Dropdown Pemain (Indikator Dot Hijau / Merah)
// -------------------------------------------------------------
function PlayerSelectDropdown({
  value,
  roster,
  onSelect,
}: {
  value: string;
  roster: RosterOption[];
  onSelect: (ign: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selected = roster.find((p) => p.ign.toLowerCase() === (value || '').toLowerCase());

  return (
    <div className="relative flex-1 min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 bg-background border border-border/80 hover:border-primary/60 rounded-xl px-3 py-2 text-xs font-bold text-foreground transition shadow-2xs text-left"
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selected ? (
            <>
              <span className={`w-2 h-2 rounded-full shrink-0 ${selected.isReleased ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span className="truncate text-foreground">{selected.ign}</span>
            </>
          ) : (
            <span className="text-muted-foreground font-medium truncate">Pilih Pemain...</span>
          )}
        </div>
        <svg className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          {roster.map((p, i) => (
            <button
              key={`${p.ign}-${i}`}
              type="button"
              onClick={() => { onSelect(p.ign); setIsOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition text-left ${value && p.ign.toLowerCase() === value.toLowerCase() ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60 text-foreground'}`}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.isReleased ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="truncate">{p.ign}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{p.idDuelLinks || '-'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Autocomplete Deck & Skill (+ Opsi Tambah Baru)
// -------------------------------------------------------------
function MetaAutocompleteDropdown({
  value,
  placeholder,
  options,
  onSelect,
  onAddNew,
}: {
  value: string;
  placeholder: string;
  options: Array<{ label: string; val: string; sub?: string }>;
  onSelect: (val: string) => void;
  onAddNew: (newVal: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

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
    if (!query.trim()) return options.slice(0, 40);
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.val.toLowerCase().includes(q)).slice(0, 40);
  }, [options, query]);

  const exactMatch = options.some((o) => o.val.toLowerCase() === query.trim().toLowerCase());
  const canAdd = query.trim().length >= 2 && !exactMatch;

  return (
    <div className="relative w-full" ref={ref}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        className="w-full bg-background border border-border/80 focus:border-primary rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-foreground focus:outline-none transition shadow-2xs truncate"
      />

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          {canAdd && (
            <button
              type="button"
              onClick={() => {
                onAddNew(query.trim());
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition text-left"
            >
              <span>➕</span>
              <span className="truncate">Tambah &quot;{query.trim()}&quot;</span>
            </button>
          )}

          {filtered.map((opt, i) => (
            <button
              key={`${opt.val}-${i}`}
              type="button"
              onClick={() => {
                onSelect(opt.val);
                setQuery(opt.val);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left transition ${
                value && opt.val.toLowerCase() === value.toLowerCase() ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60 text-foreground'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.sub && <span className="text-[9px] font-mono text-muted-foreground shrink-0">{opt.sub}</span>}
            </button>
          ))}

          {filtered.length === 0 && !canAdd && (
            <div className="px-3 py-2 text-center text-[10px] text-muted-foreground">Tidak ada hasil</div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Komponen Lineup Editor
// -------------------------------------------------------------
export function EditorLineup({
  teamAName = 'Team A',
  teamBName = 'Team B',
  teamALineup,
  teamBLineup,
  rosterA = [],
  rosterB = [],
  masterDecks = [],
  masterSkills = [],
  masterArchetypes = [],
  onChange,
  onSelectRoster,
  onAddNewDeck,
  onAddNewSkill,
}: EditorLineupProps) {
  const handleAddNewDeck = async (side: 'A' | 'B', idx: number, slot: 'deck1' | 'deck2', deckName: string) => {
    onChange(side, idx, 'archetype', deckName, slot);
    try {
      const res = await fetch('/api/admin/match-report/sync-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck: deckName }),
      });
      const data = await res.json();
      if (data.success && data.cleanDeck) {
        onChange(side, idx, 'archetype', data.cleanDeck, slot);
        if (onAddNewDeck) onAddNewDeck(data.cleanDeck);
      }
    } catch (err) {
      console.error('Gagal sync deck:', err);
    }
  };

  const handleAddNewSkill = async (side: 'A' | 'B', idx: number, slot: 'deck1' | 'deck2', skillName: string) => {
    onChange(side, idx, 'skill', skillName, slot);
    try {
      const res = await fetch('/api/admin/match-report/sync-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: skillName }),
      });
      const data = await res.json();
      if (data.success && data.cleanSkill) {
        onChange(side, idx, 'skill', data.cleanSkill, slot);
        if (onAddNewSkill) {
          onAddNewSkill({
            name: data.cleanSkill,
            code: data.generatedCode,
            label: data.generatedCode ? `${data.cleanSkill} [${data.generatedCode}]` : data.cleanSkill,
          });
        }
      }
    } catch (err) {
      console.error('Gagal sync skill:', err);
    }
  };

  // Evaluasi Archetype Duplikat Menggunakan `extractArchetypesFromDeck` Asli
  const checkDuplicates = (lineup: PlayerLineupItem[]) => {
    const counts: Record<string, number> = {};
    for (const p of lineup || []) {
      const d1 = p.deck1?.archetype?.trim();
      const d2 = p.deck2?.archetype?.trim();
      if (d1 && d1 !== '-') {
        for (const arch of extractArchetypesFromDeck(d1, masterArchetypes)) {
          counts[arch] = (counts[arch] || 0) + 1;
        }
      }
      if (d2 && d2 !== '-') {
        for (const arch of extractArchetypesFromDeck(d2, masterArchetypes)) {
          counts[arch] = (counts[arch] || 0) + 1;
        }
      }
    }
    const dupes = Object.entries(counts).filter(([_, count]) => count >= 2).sort((a, b) => b[1] - a[1]);
    const total = dupes.reduce((acc, [_, count]) => acc + count, 0);
    return { dupes, total, isExceeded: total > 5 };
  };

  const dupA = checkDuplicates(teamALineup);
  const dupB = checkDuplicates(teamBLineup);

  const deckOptions = useMemo(() => masterDecks.map((d) => ({ label: d, val: d })), [masterDecks]);
  const skillOptions = useMemo(() => masterSkills.map((s) => ({ label: s.label, val: s.name, sub: s.code })), [masterSkills]);

  const slotsA = teamALineup.length === 5 ? teamALineup : Array.from({ length: 5 }, (_, i) => teamALineup[i] || {
    ign: '', idDuelLinks: '', remainingLife: 2, totalWins: 0, totalLosses: 0,
    deck1: { archetype: '', skill: '' }, deck2: { archetype: '', skill: '' }
  });

  const slotsB = teamBLineup.length === 5 ? teamBLineup : Array.from({ length: 5 }, (_, i) => teamBLineup[i] || {
    ign: '', idDuelLinks: '', remainingLife: 2, totalWins: 0, totalLosses: 0,
    deck1: { archetype: '', skill: '' }, deck2: { archetype: '', skill: '' }
  });

  const renderSide = (
    side: 'A' | 'B',
    title: string,
    list: PlayerLineupItem[],
    roster: RosterOption[],
    color: string,
    dupInfo: ReturnType<typeof checkDuplicates>
  ) => (
    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
      <div className={`text-xs font-black uppercase tracking-wider ${color} border-b border-border/60 pb-2 flex justify-between items-center`}>
        <span>{title} (5 Duelist)</span>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif</span>
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Out</span>
        </div>
      </div>

      {dupInfo.dupes.length > 0 && (
        <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
          dupInfo.isExceeded ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="font-black flex justify-between items-center">
            <span>📑 Duplikasi Archetype ({dupInfo.total} / 5)</span>
            {dupInfo.isExceeded && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black">LEWAT BATAS</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {dupInfo.dupes.map(([arch, cnt]) => (
              <span key={arch} className="px-2 py-0.5 rounded-md bg-black/40 text-[10px] font-mono border border-white/10">
                {arch}: <b>{cnt}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.map((p, idx) => (
          <div key={idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
            <div className="flex gap-2 items-center">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              <PlayerSelectDropdown
                value={p.ign || ''}
                roster={roster}
                onSelect={(ign) => onSelectRoster(side, idx, ign)}
              />

              <input
                type="text"
                placeholder="ID Duel Links"
                value={p.idDuelLinks || ''}
                readOnly
                className="w-28 bg-muted/40 border border-border rounded-xl px-2.5 py-2 text-[11px] font-mono text-muted-foreground focus:outline-none shrink-0 cursor-not-allowed text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {(['deck1', 'deck2'] as const).map((dSlot, dIdx) => (
                <div key={dSlot} className="space-y-1.5 bg-background/60 p-2 rounded-xl border border-border/40">
                  <span className="font-black text-muted-foreground uppercase text-[9px] tracking-wider">
                    Deck {dIdx + 1}
                  </span>

                  <MetaAutocompleteDropdown
                    value={p[dSlot]?.archetype || ''}
                    placeholder="Archetype..."
                    options={deckOptions}
                    onSelect={(val) => onChange(side, idx, 'archetype', val, dSlot)}
                    onAddNew={(val) => handleAddNewDeck(side, idx, dSlot, val)}
                  />

                  <MetaAutocompleteDropdown
                    value={p[dSlot]?.skill || ''}
                    placeholder="Skill..."
                    options={skillOptions}
                    onSelect={(val) => onChange(side, idx, 'skill', val, dSlot)}
                    onAddNew={(val) => handleAddNewSkill(side, idx, dSlot, val)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {renderSide('A', teamAName, slotsA, rosterA, 'text-primary', dupA)}
      {renderSide('B', teamBName, slotsB, rosterB, 'text-rose-500', dupB)}
    </div>
  );
          }
                  
