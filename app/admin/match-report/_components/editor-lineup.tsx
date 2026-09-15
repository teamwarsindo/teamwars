'use client';

import { PlayerLineupItem } from '../types';

interface EditorLineupProps {
  teamAName?: string;
  teamBName?: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  rosterA: Array<{ ign: string; idDuelLinks?: string }>;
  rosterB: Array<{ ign: string; idDuelLinks?: string }>;
  masterDecks: string[];
  masterSkills: Array<{ name: string; label: string }>;
  onChange: (side: 'A' | 'B', idx: number, field: string, val: any, deckSlot?: 'deck1' | 'deck2') => void;
  onSelectRoster: (side: 'A' | 'B', idx: number, ign: string) => void;
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
  onChange,
  onSelectRoster,
}: EditorLineupProps) {
  // Pastikan array selalu berisi 5 slot agar tidak pernah kosong seperti di screenshot
  const slotsA = teamALineup.length === 5 ? teamALineup : Array.from({ length: 5 }, (_, i) => teamALineup[i] || {
    ign: '', idDuelLinks: '', remainingLife: 2, totalWins: 0, totalLosses: 0,
    deck1: { archetype: '', skill: '' }, deck2: { archetype: '', skill: '' }
  });

  const slotsB = teamBLineup.length === 5 ? teamBLineup : Array.from({ length: 5 }, (_, i) => teamBLineup[i] || {
    ign: '', idDuelLinks: '', remainingLife: 2, totalWins: 0, totalLosses: 0,
    deck1: { archetype: '', skill: '' }, deck2: { archetype: '', skill: '' }
  });

  const renderSide = (side: 'A' | 'B', title: string, list: PlayerLineupItem[], roster: any[], color: string) => (
    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
      <div className={`text-xs font-black uppercase tracking-wider ${color} border-b border-border/60 pb-2`}>
        {title} (5 Duelist)
      </div>

      <div className="space-y-2.5">
        {list.map((p, idx) => (
          <div key={idx} className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
            <div className="flex gap-2 items-center">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              {/* Autocomplete Input Pemain */}
              <input
                type="text"
                placeholder="Pilih / Ketik IGN Pemain..."
                list={`roster-${side}-list`}
                value={p.ign || ''}
                onChange={(e) => onSelectRoster(side, idx, e.target.value)}
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
              />

              <input
                type="text"
                placeholder="ID Duel Links"
                value={p.idDuelLinks || ''}
                onChange={(e) => onChange(side, idx, 'idDuelLinks', e.target.value)}
                className="w-28 bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-mono text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Deck 1 & Deck 2 Autocomplete Input */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {(['deck1', 'deck2'] as const).map((dSlot, dIdx) => (
                <div key={dSlot} className="space-y-1 bg-background/50 p-2 rounded-lg border border-border/40">
                  <span className="font-bold text-muted-foreground uppercase text-[9px]">Deck {dIdx + 1}</span>
                  <input
                    type="text"
                    placeholder="Archetype (e.g. Infernity)"
                    list="master-decks-list"
                    value={p[dSlot]?.archetype || ''}
                    onChange={(e) => onChange(side, idx, 'archetype', e.target.value, dSlot)}
                    className="w-full bg-background border border-border rounded-md px-2 py-1 font-medium focus:outline-none focus:border-primary text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Skill"
                    list="master-skills-list"
                    value={p[dSlot]?.skill || ''}
                    onChange={(e) => onChange(side, idx, 'skill', e.target.value, dSlot)}
                    className="w-full bg-background border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <datalist id={`roster-${side}-list`}>
        {roster.map((m, i) => (
          <option key={i} value={m.ign}>
            {m.ign} ({m.idDuelLinks || '-'})
          </option>
        ))}
      </datalist>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Global Datalist untuk Autocomplete Deck & Skill Master */}
      <datalist id="master-decks-list">
        {masterDecks.map((d, i) => (
          <option key={i} value={d} />
        ))}
      </datalist>
      <datalist id="master-skills-list">
        {masterSkills.map((s, i) => (
          <option key={i} value={s.name}>
            {s.label}
          </option>
        ))}
      </datalist>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderSide('A', teamAName, slotsA, rosterA, 'text-primary')}
        {renderSide('B', teamBName, slotsB, rosterB, 'text-rose-500')}
      </div>
    </div>
  );
}
