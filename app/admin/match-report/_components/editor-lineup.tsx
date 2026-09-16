'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { PlayerSelectDropdown, RosterOption } from './player-dropdown';
import { MetaAutocompleteDropdown } from './meta-autocomplete';
import { extractArchetypesFromDeck } from '@/lib/discord/commands/submit/archetype';

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
  // Sync deck baru ke KV
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

  // Sync skill baru ke KV
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

  // Cek duplikasi archetype tim (Max 5)
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
  const skillOptions = useMemo(
    () => masterSkills.map((s) => ({ label: s.label, val: s.name, sub: s.code })),
    [masterSkills]
  );

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
