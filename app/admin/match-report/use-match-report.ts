'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTeamSlug } from '@/app/tournament/_library';
import { PlayerLineupItem, GameEntry, RosterOption } from './types';

const initEmpty = (): PlayerLineupItem[] =>
  Array.from({ length: 5 }, () => ({
    ign: '',
    idDuelLinks: '',
    remainingLife: 2,
    totalWins: 0,
    totalLosses: 0,
    deck1: { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
    deck2: { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
  }));

export function useMatchReport(selectedMatchId: string, activeMatch: any, selectedWeek: number | '') {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [teamALineup, setTeamALineup] = useState<PlayerLineupItem[]>([]);
  const [teamBLineup, setTeamBLineup] = useState<PlayerLineupItem[]>([]);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [repeatsA, setRepeatsA] = useState(0);
  const [repeatsB, setRepeatsB] = useState(0);
  const [warnsA, setWarnsA] = useState(0);
  const [warnsB, setWarnsB] = useState(0);

  const [rosterA, setRosterA] = useState<RosterOption[]>([]);
  const [rosterB, setRosterB] = useState<RosterOption[]>([]);
  const [masterDecks, setMasterDecks] = useState<string[]>([]);
  const [masterSkills, setMasterSkills] = useState<Array<{ name: string; label: string; code?: string }>>([]);
  const [masterArchetypes, setMasterArchetypes] = useState<string[]>([]);

  const fetchMeta = useCallback(async (teamA: string, teamB: string) => {
    try {
      const res = await fetch(`/api/admin/match-report/meta?slugA=${getTeamSlug(teamA)}&slugB=${getTeamSlug(teamB)}`);
      const meta = await res.json();
      if (meta.success) {
        setRosterA(meta.rosterA || []);
        setRosterB(meta.rosterB || []);
        setMasterDecks(meta.masterDecks || []);
        setMasterSkills(meta.masterSkills || []);
        setMasterArchetypes(meta.masterArchetypes || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const recalculateFromGames = useCallback((currentGames: GameEntry[], baseLineupA: PlayerLineupItem[], baseLineupB: PlayerLineupItem[]) => {
    const freshA = baseLineupA.map((p) => ({
      ...p,
      remainingLife: 2,
      totalWins: 0,
      totalLosses: 0,
      deck1: { ...p.deck1, wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
      deck2: { ...p.deck2, wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
    }));

    const freshB = baseLineupB.map((p) => ({
      ...p,
      remainingLife: 2,
      totalWins: 0,
      totalLosses: 0,
      deck1: { ...p.deck1, wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
      deck2: { ...p.deck2, wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
    }));

    let activeWarnsA = 0;
    let activeWarnsB = 0;

    for (const g of currentGames) {
      const pA = freshA.find((p) => p.ign.toLowerCase() === g.playerA.ign.toLowerCase());
      const pB = freshB.find((p) => p.ign.toLowerCase() === g.playerB.ign.toLowerCase());
      const isAWin = g.winner === 'teamA';
      const isDeckloss = Boolean((g as any).isDeckloss);

      if (g.ssHandA === false) activeWarnsA++;
      if (g.ssHandB === false) activeWarnsB++;

      if (isDeckloss || (g as any).lossCondition === 'PENALTY_2') {
        if (!isAWin) activeWarnsA = 0;
        else activeWarnsB = 0;
      }

      // Evaluasi Tim A
      if (pA) {
        const dA = [pA.deck1, pA.deck2].find(
          (d) => d && String(d.archetype || '').toLowerCase() === String(g.playerA.archetype || '').toLowerCase()
        ) || pA.deck1;

        if (g.playerA?.isRepeat) {
          dA.isRepeatUsed = true;
        }

        if (isAWin) {
          pA.totalWins = (pA.totalWins || 0) + 1;
          dA.wins = (dA.wins || 0) + 1;
        } else {
          pA.totalLosses = (pA.totalLosses || 0) + 1;
          pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
          dA.losses = (dA.losses || 0) + 1;
          dA.isDead = true;
        }
      }

      // Evaluasi Tim B
      if (pB) {
        const dB = [pB.deck1, pB.deck2].find(
          (d) => d && String(d.archetype || '').toLowerCase() === String(g.playerB.archetype || '').toLowerCase()
        ) || pB.deck1;

        if (g.playerB?.isRepeat) {
          dB.isRepeatUsed = true;
        }

        if (!isAWin) {
          pB.totalWins = (pB.totalWins || 0) + 1;
          dB.wins = (dB.wins || 0) + 1;
        } else {
          pB.totalLosses = (pB.totalLosses || 0) + 1;
          pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
          dB.losses = (dB.losses || 0) + 1;
          dB.isDead = true;
        }
      }
    }

    // Hitung pemakaian hak repeat berdasarkan berapa slot deck yang ditandai repeat
    const repA = freshA.reduce(
      (count, p) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
      0
    );
    const repB = freshB.reduce(
      (count, p) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
      0
    );

    setTeamALineup(freshA);
    setTeamBLineup(freshB);
    setRepeatsA(repA);
    setRepeatsB(repB);
    setWarnsA(activeWarnsA);
    setWarnsB(activeWarnsB);
    setScoreA(currentGames.filter((g) => g.winner === 'teamA').length);
    setScoreB(currentGames.filter((g) => g.winner === 'teamB').length);
  }, []);

  useEffect(() => {
    if (!selectedMatchId || !activeMatch) {
      setTeamALineup(initEmpty());
      setTeamBLineup(initEmpty());
      setGames([]);
      setScoreA(0);
      setScoreB(0);
      setWarnsA(0);
      setWarnsB(0);
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    fetchMeta(activeMatch.teamAName, activeMatch.teamBName);

    fetch(`/api/admin/match-report?matchId=${selectedMatchId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.report && (json.report.teamA?.lineup?.length > 0 || json.report.games?.length > 0)) {
          const r = json.report;
          const lA = r.teamA?.lineup?.length === 5 ? r.teamA.lineup : initEmpty();
          const lB = r.teamB?.lineup?.length === 5 ? r.teamB.lineup : initEmpty();
          const loadedGames = r.games || [];
          setGames(loadedGames);
          recalculateFromGames(loadedGames, lA, lB);
        } else {
          setTeamALineup(initEmpty());
          setTeamBLineup(initEmpty());
          setGames([]);
          setScoreA(0);
          setScoreB(0);
          setWarnsA(0);
          setWarnsB(0);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedMatchId, activeMatch, fetchMeta, recalculateFromGames]);

  const handleAddGame = (d: any) => {
    const pA = teamALineup.find((p) => p.ign === d.playerAIgn);
    const pB = teamBLineup.find((p) => p.ign === d.playerBIgn);
    if (!pA || !pB) return;

    const dA = d.deckAType === 'deck1' ? pA.deck1 : pA.deck2;
    const dB = d.deckBType === 'deck1' ? pB.deck1 : pB.deck2;

    const skillCodeA = masterSkills.find((s) => s.name === dA.skill || s.label === dA.skill)?.code || dA.skill;
    const skillCodeB = masterSkills.find((s) => s.name === dB.skill || s.label === dB.skill)?.code || dB.skill;

    const isDeckloss = Boolean(d.isDeckloss);
    const decklossTeam = isDeckloss ? (d.winner === 'teamA' ? 'teamB' : 'teamA') : '';

    // Status repeat tetap aktif jika baru saja ditekan ATAU deck tersebut memang deck repeat yang sedang stay
    const isRepeatA = Boolean(d.isRepeatA || dA.isRepeatUsed);
    const isRepeatB = Boolean(d.isRepeatB || dB.isRepeatUsed);

    const newGame: GameEntry = {
      gameNumber: games.length + 1,
      winner: d.winner,
      playerA: {
        ign: pA.ign,
        idDuelLinks: pA.idDuelLinks,
        archetype: dA.archetype,
        skill: skillCodeA,
        isRepeat: isRepeatA,
      },
      playerB: {
        ign: pB.ign,
        idDuelLinks: pB.idDuelLinks,
        archetype: dB.archetype,
        skill: skillCodeB,
        isRepeat: isRepeatB,
      },
      ssHandA: Boolean(d.ssHandA),
      ssHandB: Boolean(d.ssHandB),
      isDeckloss,
      decklossTeam,
      notes: d.notes,
      timestamp: new Date().toISOString(),
    } as any;

    const nextGames = [...games, newGame];
    setGames(nextGames);
    recalculateFromGames(nextGames, teamALineup, teamBLineup);
  };

  const handleRollbackGame = () => {
    if (games.length === 0) return;
    const nextGames = games.slice(0, -1);
    setGames(nextGames);
    recalculateFromGames(nextGames, teamALineup, teamBLineup);
  };

  const handleSaveToDatabase = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/match-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: selectedMatchId,
          action: 'direct_save',
          reportData: {
            matchId: selectedMatchId,
            week: Number(activeMatch?.weekNumber || selectedWeek || 1),
            metadata: {
              date: activeMatch?.matchDate ? activeMatch.matchDate.split('T')[0] : '',
              referee: activeMatch?.referee || 'Kaiba',
              streamer: activeMatch?.streamer || '',
            },
            teamA: { name: activeMatch?.teamAName, score: scoreA, repeatsUsed: repeatsA, warningsUsed: warnsA, lineup: teamALineup },
            teamB: { name: activeMatch?.teamBName, score: scoreB, repeatsUsed: repeatsB, warningsUsed: warnsB, lineup: teamBLineup },
            games,
            isFinished: scoreA >= 10 || scoreB >= 10,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Match Report berhasil disimpan!' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Gagal menyimpan report.' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    statusMsg,
    teamALineup,
    setTeamALineup,
    teamBLineup,
    setTeamBLineup,
    games,
    scoreA,
    scoreB,
    repeatsA,
    repeatsB,
    warnsA,
    setWarnsA,
    warnsB,
    setWarnsB,
    rosterA,
    rosterB,
    masterDecks,
    masterSkills,
    masterArchetypes,
    fetchMeta,
    handleAddGame,
    handleRollbackGame,
    handleSaveToDatabase,
  };
                                }
            
