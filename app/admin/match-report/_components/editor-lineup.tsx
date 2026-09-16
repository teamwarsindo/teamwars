'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { PlayerLineupItem } from '../types';
import { ArchetypeQuotaBanner } from './archetype-banner';
import { DuelistEditorForm } from './duelist-editor-form';
import { MetaAutocompleteOption } from './meta-autocomplete';

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

interface EditorLineupProps {
  teamAName: string;
  teamBName: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  rosterA: RosterOption[];
  rosterB: RosterOption[];
  masterDecks: string[];
  masterSkills: Array<{ name: string; label: string; code?: string }>;
  masterArchetypes: string[];
  onChangeLineup: (side: 'A' | 'B', newLineup: PlayerLineupItem[]) => void;
  onRefreshMeta?: () => Promise<void>;
}

export function EditorLineup({
  teamAName,
  teamBName,
  teamALineup,
  teamBLineup,
  rosterA,
  rosterB,
  masterDecks,
  masterSkills,
  masterArchetypes,
  onChangeLineup,
  onRefreshMeta,
}: EditorLineupProps) {
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [modalWarn, setModalWarn] = useState<string | null>(null);

  // Cache deck agar saat uncheck dan check kembali susunan deck tidak hilang
  const [deckCache, setDeckCache] = useState<Record<string, { deck1: any; deck2: any }>>({});

  const currentTeamName = activeSide === 'A' ? teamAName : teamBName;
  const currentLineup = activeSide === 'A' ? teamALineup : teamBLineup;
  const rawRoster = activeSide === 'A' ? rosterA : rosterB;

  // SORTING ROSTER: Aktif A-Z dulu, kemudian Out A-Z
  const sortedRoster = useMemo(() => {
    const active = rawRoster.filter((p) => !p.isReleased).sort((a, b) => a.ign.localeCompare(b.ign));
    const out = rawRoster.filter((p) => p.isReleased).sort((a, b) => a.ign.localeCompare(b.ign));
    return [...active, ...out];
  }, [rawRoster]);

  // Simpan data deck awal ke cache saat pertama kali di-load
  useMemo(() => {
    const initial: Record<string, { deck1: any; deck2: any }> = {};
    [...teamALineup, ...teamBLineup].forEach((p) => {
      if (p.ign && (p.deck1?.archetype || p.deck2?.archetype)) {
        initial[p.ign.toLowerCase()] = { deck1: p.deck1, deck2: p.deck2 };
      }
    });
    setDeckCache((prev) => ({ ...initial, ...prev }));
  }, [teamALineup, teamBLineup]);

  const deckOptions: MetaAutocompleteOption[] = useMemo(() => masterDecks.map((d) => ({ label: d, val: d })), [masterDecks]);
  const skillOptions: MetaAutocompleteOption[] = useMemo(() => masterSkills.map((s) => ({ label: s.label, val: s.name, sub: s.code })), [masterSkills]);

  const handleChangeDeck = useCallback((playerIdx: number, slot: 'deck1' | 'deck2', field: 'archetype' | 'skill', val: string) => {
    const activePlayers = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const updated = [...activePlayers];
    const target = { ...updated[playerIdx] };

    target[slot] = { ...(target[slot] || { archetype: '', skill: '' }), [field]: val };
    updated[playerIdx] = target;

    if (target.ign) {
      setDeckCache((prev) => ({
        ...prev,
        [target.ign.toLowerCase()]: { deck1: target.deck1, deck2: target.deck2 },
      }));
    }
    onChangeLineup(activeSide, updated);
  }, [currentLineup, activeSide, onChangeLineup]);

  const handleToggleRoster = (player: RosterOption) => {
    setModalWarn(null);
    const activePlayers = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const exists = activePlayers.some((p) => p.ign.toLowerCase() === player.ign.toLowerCase());

    if (exists) {
      const existing = activePlayers.find((p) => p.ign.toLowerCase() === player.ign.toLowerCase());
      if (existing) {
        setDeckCache((prev) => ({
          ...prev,
          [player.ign.toLowerCase()]: { deck1: existing.deck1, deck2: existing.deck2 },
        }));
      }
      onChangeLineup(activeSide, activePlayers.filter((p) => p.ign.toLowerCase() !== player.ign.toLowerCase()));
    } else {
      if (activePlayers.length >= 5) {
        setModalWarn('Maksimal 5 pemain dalam lineup tim.');
        return;
      }
      const cached = deckCache[player.ign.toLowerCase()];
      const newPlayer: PlayerLineupItem = {
        ign: player.ign,
        idDuelLinks: player.idDuelLinks || '',
        remainingLife: 2,
        totalWins: 0,
        totalLosses: 0,
        deck1: cached?.deck1 || { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
        deck2: cached?.deck2 || { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
      };
      onChangeLineup(activeSide, [...activePlayers, newPlayer]);
    }
  };

  // AUDIT GABUNGAN: Roster (Target 5) & Deck (Target 10)
  const audit = useMemo(() => {
    const activePlayers = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const playerCount = activePlayers.length;
    const missingPlayers = Math.max(0, 5 - playerCount);

    let filledDecks = 0;
    let missingSkills = 0;

    activePlayers.forEach((p) => {
      const d1 = p.deck1?.archetype?.trim();
      const d2 = p.deck2?.archetype?.trim();
      if (d1 && d1 !== '-') {
        filledDecks++;
        if (!p.deck1?.skill?.trim()) missingSkills++;
      }
      if (d2 && d2 !== '-') {
        filledDecks++;
        if (!p.deck2?.skill?.trim()) missingSkills++;
      }
    });

    const totalDeckloss = 10 - filledDecks;
    const isClean = playerCount === 5 && totalDeckloss === 0 && missingSkills === 0;

    return { playerCount, missingPlayers, filledDecks, totalDeckloss, missingSkills, isClean };
  }, [currentLineup]);

  return (
    <div className="space-y-4">
      {/* 1. Pemilihan Tim (Nama Tim Bersih) & Tombol Modal Roster */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setActiveSide('A'); setModalWarn(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSide === 'A' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {teamAName}
          </button>
          <button
            type="button"
            onClick={() => { setActiveSide('B'); setModalWarn(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSide === 'B' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {teamBName}
          </button>
        </div>

        <button
          type="button"
          onClick={() => { setIsRosterModalOpen(true); setModalWarn(null); }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>📋</span>
          <span>Pilih 5 Pemain ({audit.playerCount}/5)</span>
        </button>
      </div>

      {/* 2. WARNING GABUNGAN DECKLOSS (Tebal, Jelas, Kontras Tinggi) */}
      {!audit.isClean && (
        <div className="p-3.5 rounded-2xl border-2 border-amber-500/60 bg-amber-500/15 text-amber-950 dark:text-amber-200 text-xs shadow-xs space-y-1">
          <div className="flex items-center justify-between font-black">
            <span className="flex items-center gap-1.5 text-sm">
              <span>⚠️</span>
              <span>Total {audit.totalDeckloss} Deckloss Terdeteksi</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-[10px] font-black uppercase tracking-wider">
              Lineup Belum Lengkap
            </span>
          </div>
          <div className="text-[11px] font-medium leading-relaxed opacity-95">
            {audit.missingPlayers > 0 && (
              <span>• Roster kurang <b>{audit.missingPlayers} pemain</b> ({audit.playerCount}/5 terpilih) menyumbang <b>{audit.missingPlayers * 2} Deckloss</b>.<br /></span>
            )}
            {audit.totalDeckloss - audit.missingPlayers * 2 > 0 && (
              <span>• Ada <b>{audit.totalDeckloss - audit.missingPlayers * 2} slot deck kosong</b> dari pemain yang dipilih.<br /></span>
            )}
            {audit.missingSkills > 0 && (
              <span className="text-rose-700 dark:text-rose-300 font-bold">• <b>{audit.missingSkills} deck</b> belum memiliki Skill Karakter!</span>
            )}
          </div>
        </div>
      )}

      {/* 3. Banner Kuota Duplikasi 5 Deck Tim */}
      <ArchetypeQuotaBanner lineup={currentLineup} masterArchetypes={masterArchetypes} />

      {/* 4. Formulir Input Deck & Skill 5 Pemain */}
      <DuelistEditorForm
        lineup={currentLineup}
        deckOptions={deckOptions}
        skillOptions={skillOptions}
        onChangeDeck={handleChangeDeck}
        onRefreshMeta={onRefreshMeta}
      />

      {/* 5. Modal Roster Picker */}
      {isRosterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setIsRosterModalOpen(false)}
        >
          <div
            className="bg-card border border-border w-full max-w-md rounded-2xl p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-xs font-black uppercase text-foreground">Roster {currentTeamName}</h3>
                <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Roster Aktif
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Keluar / Transfer
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded-lg hover:bg-muted"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Peringatan Modal Kontras Tinggi */}
            {modalWarn && (
              <div className="p-2.5 rounded-xl border-2 border-rose-500/50 bg-rose-500/15 text-rose-950 dark:text-rose-200 text-xs font-bold flex items-center justify-between">
                <span>⚠️ {modalWarn}</span>
                <button type="button" onClick={() => setModalWarn(null)} className="text-[11px] font-black opacity-80 hover:opacity-100 cursor-pointer">✕</button>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1 p-1">
              {sortedRoster.map((p, idx) => {
                const isSelected = currentLineup.some(
                  (s) => s.ign?.toLowerCase() === p.ign.toLowerCase()
                );

                return (
                  <button
                    key={`${p.ign}-${idx}`}
                    type="button"
                    onClick={() => handleToggleRoster(p)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.isReleased ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      <span className="truncate">{p.ign}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{p.idDuelLinks || '-'}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Terpilih: <b className="text-foreground">{audit.playerCount} / 5</b></span>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                                 }
    
