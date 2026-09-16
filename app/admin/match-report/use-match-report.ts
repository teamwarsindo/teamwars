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

  useEffect(() => {
    if (!selectedMatchId || !activeMatch) {
      setTeamALineup(initEmpty());
      setTeamBLineup(initEmpty());
      setGames([]);
      setScoreA(0);
      setScoreB(0);
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
          setTeamALineup(r.teamA?.lineup?.length === 5 ? r.teamA.lineup : initEmpty());
          setTeamBLineup(r.teamB?.lineup?.length === 5 ? r.teamB.lineup : initEmpty());
          setGames(r.games || []);
          setScoreA(r.teamA?.score ?? 0);
          setScoreB(r.teamB?.score ?? 0);
          setRepeatsA(r.teamA?.repeatsUsed ?? 0);
          setRepeatsB(r.teamB?.repeatsUsed ?? 0);
          setWarnsA(r.teamA?.warningsUsed ?? 0);
          setWarnsB(r.teamB?.warningsUsed ?? 0);
        } else {
          setTeamALineup(initEmpty());
          setTeamBLineup(initEmpty());
          setGames([]);
          setScoreA(0);
          setScoreB(0);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedMatchId, activeMatch, fetchMeta]);

  const handleAddGame = (d: any) => {
    const pA = teamALineup.find((p) => p.ign === d.playerAIgn);
    const pB = teamBLineup.find((p) => p.ign === d.playerBIgn);
    if (!pA || !pB) return;

    const dA = d.deckAType === 'deck1' ? pA.deck1 : pA.deck2;
    const dB = d.deckBType === 'deck1' ? pB.deck1 : pB.deck2;
    const isA = d.winner === 'teamA';

    if (isA) {
      pA.totalWins += 1;
      dA.wins = (dA.wins || 0) + 1;
      pB.totalLosses += 1;
      pB.remainingLife = Math.max(0, pB.remainingLife - 1);
      dB.losses = (dB.losses || 0) + 1;
      dB.isDead = true;
    } else {
      pB.totalWins += 1;
      dB.wins = (dB.wins || 0) + 1;
      pA.totalLosses += 1;
      pA.remainingLife = Math.max(0, pA.remainingLife - 1);
      dA.losses = (dA.losses || 0) + 1;
      dA.isDead = true;
    }

    if (d.isRepeatA) setRepeatsA((r) => r + 1);
    if (d.isRepeatB) setRepeatsB((r) => r + 1);

    setGames([
      ...games,
      {
        gameNumber: games.length + 1,
        winner: d.winner,
        playerA: {
          ign: pA.ign,
          idDuelLinks: pA.idDuelLinks,
          archetype: dA.archetype,
          skill: dA.skill,
          isRepeat: d.isRepeatA,
        },
        playerB: {
          ign: pB.ign,
          idDuelLinks: pB.idDuelLinks,
          archetype: dB.archetype,
          skill: dB.skill,
          isRepeat: d.isRepeatB,
        },
        notes: d.notes,
        timestamp: new Date().toISOString(),
      },
    ]);
    setScoreA(isA ? scoreA + 1 : scoreA);
    setScoreB(!isA ? scoreB + 1 : scoreB);
  };

  const handleRollbackGame = () => {
    if (games.length === 0) return;
    const popped = games[games.length - 1];
    const isA = popped.winner === 'teamA';
    setGames(games.slice(0, -1));
    setScoreA(isA ? Math.max(0, scoreA - 1) : scoreA);
    setScoreB(!isA ? Math.max(0, scoreB - 1) : scoreB);
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
            teamA: {
              name: activeMatch?.teamAName,
              score: scoreA,
              repeatsUsed: repeatsA,
              warningsUsed: warnsA,
              lineup: teamALineup,
            },
            teamB: {
              name: activeMatch?.teamBName,
              score: scoreB,
              repeatsUsed: repeatsB,
              warningsUsed: warnsB,
              lineup: teamBLineup,
            },
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
    warnsB,
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
