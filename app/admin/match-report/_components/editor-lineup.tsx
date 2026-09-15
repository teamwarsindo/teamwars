'use client';

import { PlayerLineupItem } from '../types';

interface EditorLineupProps {
  teamAName?: string;
  teamBName?: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  rosterA: any[];
  rosterB: any[];
  onChange: (side: 'A' | 'B', idx: number, field: string, val: any, deckSlot?: 'deck1' | 'deck2') => void;
  onSelectRoster: (side: 'A' | 'B', idx: number, ign: string) => void;
}

export function EditorLineup({
  teamAName = 'Team A',
  teamBName = 'Team B',
  teamALineup,
  teamBLineup,
  rosterA,
  rosterB,
  onChange,
  onSelectRoster,
}: EditorLineupProps) {
  const renderTeamColumn = (side: 'A' | 'B', title: string, lineup: PlayerLineupItem[], roster: any[], colorClass: string) => (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-3 shadow-xs">
      <div className={`text-xs font-black uppercase tracking-wider ${colorClass} border-b border-border/60 pb-1.5`}>
        {title} (5 Duelist)
      </div>
      {lineup.map((p, idx) => (
        <div key={idx} className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <input
              type="text"
              placeholder="Pilih / Ketik IGN..."
              list={`roster-${side}`}
              value={p.ign}
              onChange={(e) => onSelectRoster(side, idx, e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="ID Duel Links"
              value={p.idDuelLinks}
              onChange={(e) => onChange(side, idx, 'idDuelLinks', e.target.value)}
              className="w-24 bg-background border border-border rounded-lg px-2 py-1 text-[10px] font-mono text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {(['deck1', 'deck2'] as const).map((slot, dIdx) => (
              <div key={slot} className="space-y-1">
                <span className="font-bold text-muted-foreground">Deck {dIdx + 1}</span>
                <input
                  type="text"
                  placeholder="Archetype"
                  value={p[slot].archetype}
                  onChange={(e) => onChange(side, idx, 'archetype', e.target.value, slot)}
                  className="w-full bg-background border border-border rounded-md p-1 font-medium focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Skill"
                  value={p[slot].skill}
                  onChange={(e) => onChange(side, idx, 'skill', e.target.value, slot)}
                  className="w-full bg-background border border-border rounded-md p-1 text-muted-foreground focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <datalist id={`roster-${side}`}>
        {roster.map((m: any, i: number) => (
          <option key={i} value={m.ign || m.name || m} />
        ))}
      </datalist>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {renderTeamColumn('A', teamAName, teamALineup, rosterA, 'text-primary')}
      {renderTeamColumn('B', teamBName, teamBLineup, rosterB, 'text-rose-500')}
    </div>
  );
}
