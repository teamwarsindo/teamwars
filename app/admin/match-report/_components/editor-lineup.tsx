'use client';

import { PlayerLineupItem } from '../types';

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
    color: string
  ) => {
    const activeList = roster.filter((r) => !r.isReleased);
    const releasedList = roster.filter((r) => r.isReleased);

    return (
      <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
        <div className={`text-xs font-black uppercase tracking-wider ${color} border-b border-border/60 pb-2 flex justify-between items-center`}>
          <span>{title} (5 Duelist)</span>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {activeList.length} Aktif {releasedList.length > 0 ? `• ${releasedList.length} Released` : ''}
          </span>
        </div>

        <div className="space-y-3">
          {list.map((p, idx) => (
            <div key={idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
              {/* Baris Pemain: Murni Dropdown Select (No Manual Input) */}
              <div className="flex gap-2 items-center">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="relative flex-1 min-w-0">
                  <select
                    value={p.ign || ''}
                    onChange={(e) => onSelectRoster(side, idx, e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl px-3 py-2 pr-8 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs truncate"
                  >
                    <option value="">-- Pilih Pemain Resmi --</option>
                    
                    {/* Grup Roster Aktif */}
                    <optgroup label="🟢 Roster Aktif">
                      {activeList.map((m, i) => (
                        <option key={`act-${i}`} value={m.ign}>
                          {m.ign} ({m.idDuelLinks || '-'})
                        </option>
                      ))}
                    </optgroup>

                    {/* Grup Pemain Dikeluarkan (Jika ada) */}
                    {releasedList.length > 0 && (
                      <optgroup label="🔴 Mantan Pemain (Released / Transfer)">
                        {releasedList.map((m, i) => (
                          <option key={`rel-${i}`} value={m.ign}>
                            {m.ign} ({m.idDuelLinks || '-'}) [Keluar]
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                {/* ID Duel Links Terkunci Otomatis Sesuai KV */}
                <input
                  type="text"
                  placeholder="ID Duel Links"
                  value={p.idDuelLinks || ''}
                  readOnly
                  className="w-28 bg-muted/40 border border-border rounded-xl px-2.5 py-2 text-[11px] font-mono text-muted-foreground focus:outline-none shrink-0 cursor-not-allowed"
                  title="ID Duel Links otomatis terisi dari data KV"
                />
              </div>

              {/* Slot Deck 1 & Deck 2 */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {(['deck1', 'deck2'] as const).map((dSlot, dIdx) => (
                  <div key={dSlot} className="space-y-1.5 bg-background/60 p-2 rounded-xl border border-border/40">
                    <span className="font-black text-muted-foreground uppercase text-[9px] tracking-wider">
                      Deck {dIdx + 1}
                    </span>
                    
                    <input
                      type="text"
                      placeholder="Archetype..."
                      list="master-decks-list"
                      value={p[dSlot]?.archetype || ''}
                      onChange={(e) => onChange(side, idx, 'archetype', e.target.value, dSlot)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground focus:outline-none focus:border-primary"
                    />

                    <input
                      type="text"
                      placeholder="Skill..."
                      list="master-skills-list"
                      value={p[dSlot]?.skill || ''}
                      onChange={(e) => onChange(side, idx, 'skill', e.target.value, dSlot)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
