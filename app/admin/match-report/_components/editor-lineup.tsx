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

  // Cache deck terikat IGN agar saat uncheck dan check kembali susunan deck tidak hilang
  const [deckCache, setDeckCache] = useState<Record<string, { deck1: any; deck2: any }>>({});

  const currentTeamName = activeSide === 'A' ? teamAName : teamBName;
  const currentLineup = activeSide === 'A' ? teamALineup : teamBLineup;
  const rawRoster = activeSide === 'A' ? rosterA : rosterB;

  // SORTING ROSTER: Aktif A-Z duluan, baru kemudian Out A-Z
  const sortedRoster = useMemo(() => {
    const active = rawRoster.filter((p) => !p.isReleased).sort((a, b) => a.ign.localeCompare(b.ign));
    const out = rawRoster.filter((p) => p.isReleased).sort((a, b) => a.ign.localeCompare(b.ign));
    return [...active, ...out];
  }, [rawRoster]);

  // Simpan initial deck ke cache saat lineup di-load dari API
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

  // Handler Edit Deck/Skill
  const handleChangeDeck = useCallback((playerIdx: number, slot: 'deck1' | 'deck2', field: 'archetype' | 'skill', val: string) => {
    const activePlayers = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const updated = [...activePlayers];
    const target = { ...updated[playerIdx] };

    target[slot] = { ...(target[slot] || { archetype: '', skill: '' }), [field]: val };
    updated[playerIdx] = target;

    // Kunci ke cache IGN
    if (target.ign) {
      setDeckCache((prev) => ({
        ...prev,
        [target.ign.toLowerCase()]: { deck1: target.deck1, deck2: target.deck2 },
      }));
    }

    onChangeLineup(activeSide, updated);
  }, [currentLineup, activeSide, onChangeLineup]);

  // Handler Centang Roster
  const handleToggleRoster = (player: RosterOption) => {
    setModalWarn(null);
    const activePlayers = currentLineup.filter((p) => Boolean(p.ign?.trim()));
    const exists = activePlayers.some((p) => p.ign.toLowerCase() === player.ign.toLowerCase());

    if (exists) {
      // Uncheck: Simpan deck terakhir pemain ke cache sebelum dilepas
      const existing = activePlayers.find((p) => p.ign.toLowerCase() === player.ign.toLowerCase());
      if (existing) {
        setDeckCache((prev) => ({
          ...prev,
          [player.ign.toLowerCase()]: { deck1: existing.deck1, deck2: existing.deck2 },
        }));
      }
      const nextList = activePlayers.filter((p) => p.ign.toLowerCase() !== player.ign.toLowerCase());
      onChangeLineup(activeSide, nextList);
    } else {
      // Check: Maksimal 5 pemain
      if (activePlayers.length >= 5) {
        setModalWarn('Maksimal 5 pemain dalam lineup tim.');
        return;
      }

      // Ambil susunan deck dari cache bila pernah diisi sebelumnya
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

  const selectedCount = currentLineup.filter((p) => Boolean(p.ign?.trim())).length;

  return (
    <div className="space-y-4">
      {/* 1. Pemilihan Tim (Murni Nama Tim Saja) & Tombol Modal Roster */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setActiveSide('A'); setModalWarn(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSide === 'A' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {teamAName}
          </button>
          <button
            type="button"
            onClick={() => { setActiveSide('B'); setModalWarn(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSide === 'B' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
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
          <span>Pilih 5 Pemain ({selectedCount}/5)</span>
        </button>
      </div>

      {/* 2. Banner Peringatan Kuota Tim / Slot Kurang (Muted & Tema Halus) */}
      {selectedCount < 5 && (
        <div className="p-3 rounded-2xl border border-border/80 bg-muted/30 text-muted-foreground text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚠️</span>
            <span>Lineup belum lengkap: <b>{selectedCount} dari 5 duelist</b> terpilih. Slot kosong dihitung sebagai deckloss.</span>
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

      {/* 5. Modal Roster Picker (Menutup Saat Klik Luar / Backdrop) */}
      {isRosterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setIsRosterModalOpen(false)}
        >
          <div
            className="bg-card border border-border w-full max-w-md rounded-2xl p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam kotak menutup modal
          >
            {/* Modal Header */}
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

            {/* Peringatan Modal Bertema (Bukan alert bawaan browser) */}
            {modalWarn && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-between">
                <span>⚠️ {modalWarn}</span>
                <button type="button" onClick={() => setModalWarn(null)} className="text-[10px] opacity-70 hover:opacity-100">✕</button>
              </div>
            )}

            {/* List Roster Ter-sort A-Z (Aktif dulu, baru Out) */}
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

            {/* Modal Footer */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Terpilih: <b className="text-foreground">{selectedCount} / 5</b></span>
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
