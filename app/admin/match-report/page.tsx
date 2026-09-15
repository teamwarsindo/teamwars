'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar, HeroHeader, Footer } from '@/components/layout-shared';
import { DIVISION_MAP, getTeamSlug } from '@/app/tournament/_library';
import { AnalyticsFilter, FilterTeamItem } from '@/app/analytics/_components/analytics-filter';
import { ReportScoreboard } from '@/app/analytics/_components/report-scoreboard';
import { ReportLineup } from '@/app/analytics/_components/report-lineup';
import { ReportLogs } from '@/app/analytics/_components/report-logs';

import { PlayerLineupItem, GameEntry } from './types';
import { EditorHeader } from './_components/editor-header';
import { EditorLineup } from './_components/editor-lineup';
import { EditorRunner } from './_components/editor-runner';

export default function AdminInteractiveMatchReport() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Filter States
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B>('ALL');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | ''>(1);
  const [selectedMatchId, setSelectedMatchId] = useState('');

  // Workspace States
  const [editorTab, setEditorTab] = useState<'lineup' | 'game' | 'preview'>('lineup');
  const [loadingReport, setLoadingReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Match Data States
  const [teamALineup, setTeamALineup] = useState<PlayerLineupItem[]>([]);
  const [teamBLineup, setTeamBLineup] = useState<PlayerLineupItem[]>([]);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [repeatsA, setRepeatsA] = useState(0);
  const [repeatsB, setRepeatsB] = useState(0);
  const [warnsA, setWarnsA] = useState(0);
  const [warnsB, setWarnsB] = useState(0);

  // Metadata Autocomplete
  const [rosterA, setRosterA] = useState<any[]>([]);
  const [rosterB, setRosterB] = useState<any[]>([]);
  const [masterDecks, setMasterDecks] = useState<string[]>([]);
  const [masterSkills, setMasterSkills] = useState<Array<{ name: string; label: string }>>([]);

  const initEmptyLineup = (): PlayerLineupItem[] =>
    Array.from({ length: 5 }, () => ({
      ign: '',
      idDuelLinks: '',
      remainingLife: 2,
      totalWins: 0,
      totalLosses: 0,
      deck1: { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
      deck2: { archetype: '', skill: '', wins: 0, losses: 0, isDead: false, isRepeatUsed: false },
    }));

  // 1. Inisialisasi Schedules & Teams
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/match-report').then((r) => r.json()),
      fetch('/api/tournament/teams').then((r) => r.json()).catch(() => ({ teams: [] })),
    ]).then(([schedRes, teamRes]) => {
      if (schedRes.schedules) setSchedules(schedRes.schedules);
      if (teamRes.teams) setTeams(teamRes.teams);
    });
  }, []);

  const activeMatch = useMemo(
    () => schedules.find((s) => s.id === selectedMatchId),
    [schedules, selectedMatchId]
  );

  const matchesInView = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedGroup !== 'ALL' && s.groupName !== selectedGroup) return false;
      if (selectedWeek !== '' && Number(s.weekNumber) !== Number(selectedWeek)) return false;
      if (selectedTeam !== '' && s.teamAName !== selectedTeam && s.teamBName !== selectedTeam) return false;
      return true;
    });
  }, [schedules, selectedGroup, selectedWeek, selectedTeam]);

  // 2. Load Report & Autocomplete Saat Match Dipilih
  useEffect(() => {
    if (!selectedMatchId || !activeMatch) {
      setTeamALineup(initEmptyLineup());
      setTeamBLineup(initEmptyLineup());
      setGames([]);
      setScoreA(0);
      setScoreB(0);
      return;
    }

    let isSubscribed = true;
    setLoadingReport(true);
    setStatusMsg(null);

    const slugA = getTeamSlug(activeMatch.teamAName);
    const slugB = getTeamSlug(activeMatch.teamBName);

    // Ambil Roster dan Master Decks & Skills
    fetch(`/api/admin/match-report/meta?slugA=${slugA}&slugB=${slugB}`)
      .then((r) => r.json())
      .then((meta) => {
        if (isSubscribed && meta.success) {
          setRosterA(meta.rosterA || []);
          setRosterB(meta.rosterB || []);
          setMasterDecks(meta.masterDecks || []);
          setMasterSkills(meta.masterSkills || []);
        }
      });

    // Ambil Data Report
    fetch(`/api/admin/match-report?matchId=${selectedMatchId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!isSubscribed) return;

        if (json.success && json.report && (json.report.teamA?.lineup?.length > 0 || json.report.games?.length > 0)) {
          const r = json.report;
          setTeamALineup(r.teamA?.lineup?.length === 5 ? r.teamA.lineup : initEmptyLineup());
          setTeamBLineup(r.teamB?.lineup?.length === 5 ? r.teamB.lineup : initEmptyLineup());
          setGames(r.games || []);
          // Hitung murni dari report
          setScoreA(r.teamA?.score ?? 0);
          setScoreB(r.teamB?.score ?? 0);
          setRepeatsA(r.teamA?.repeatsUsed ?? 0);
          setRepeatsB(r.teamB?.repeatsUsed ?? 0);
          setWarnsA(r.teamA?.warningsUsed ?? 0);
          setWarnsB(r.teamB?.warningsUsed ?? 0);
          if (r.games?.length > 0) setEditorTab('game');
          else setEditorTab('lineup');
        } else {
          // JIKA BELUM ADA REPORT (Backfill): Force skor ke 0 - 0 dan siapkan 5 slot kosong
          setTeamALineup(initEmptyLineup());
          setTeamBLineup(initEmptyLineup());
          setGames([]);
          setScoreA(0);
          setScoreB(0);
          setRepeatsA(0);
          setRepeatsB(0);
          setWarnsA(0);
          setWarnsB(0);
          setEditorTab('lineup');
        }
      })
      .finally(() => {
        if (isSubscribed) setLoadingReport(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedMatchId, activeMatch]);

  const handleLineupChange = (side: 'A' | 'B', idx: number, field: string, val: any, deckSlot?: 'deck1' | 'deck2') => {
    const list = side === 'A' ? [...teamALineup] : [...teamBLineup];
    if (deckSlot) {
      list[idx][deckSlot] = { ...list[idx][deckSlot], [field]: val };
    } else {
      (list[idx] as any)[field] = val;
    }
    side === 'A' ? setTeamALineup(list) : setTeamBLineup(list);
  };

  const handleSelectRoster = (side: 'A' | 'B', idx: number, ign: string) => {
    const roster = side === 'A' ? rosterA : rosterB;
    const found = roster.find((m) => m.ign?.toLowerCase() === ign.toLowerCase());

    handleLineupChange(side, idx, 'ign', ign);
    if (found && found.idDuelLinks) {
      handleLineupChange(side, idx, 'idDuelLinks', found.idDuelLinks);
    }
  };

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
        playerA: { ign: pA.ign, idDuelLinks: pA.idDuelLinks, archetype: dA.archetype, skill: dA.skill, isRepeat: d.isRepeatA },
        playerB: { ign: pB.ign, idDuelLinks: pB.idDuelLinks, archetype: dB.archetype, skill: dB.skill, isRepeat: d.isRepeatB },
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
            teamA: { name: activeMatch?.teamAName, score: scoreA, repeatsUsed: repeatsA, warningsUsed: warnsA, lineup: teamALineup },
            teamB: { name: activeMatch?.teamBName, score: scoreB, repeatsUsed: repeatsB, warningsUsed: warnsB, lineup: teamBLineup },
            games,
            isFinished: scoreA >= 10 || scoreB >= 10,
          },
        }),
      });
      const data = await res.json();
      if (data.success) setStatusMsg({ type: 'success', text: 'Match Report berhasil disimpan & disinkronkan!' });
      else setStatusMsg({ type: 'error', text: data.error || 'Gagal menyimpan report.' });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Interactive Report Editor" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-3 sm:px-6 pb-12">
        <HeroHeader showDetails={false} />

        <section className="w-full max-w-4xl space-y-4">
          <AnalyticsFilter
            mode="reports"
            selectedGroup={selectedGroup}
            onGroupChange={(g) => { setSelectedGroup(g); setSelectedMatchId(''); }}
            selectedTeam={selectedTeam}
            onTeamChange={(t) => { setSelectedTeam(t); setSelectedMatchId(''); }}
            teams={teams}
            selectedWeek={selectedWeek}
            onWeekChange={(w) => { setSelectedWeek(w); setSelectedMatchId(''); }}
            availableWeeks={[1, 2, 3, 4, 5, 6, 7]}
            selectedMatchId={selectedMatchId}
            onMatchChange={(mId) => setSelectedMatchId(mId)}
            matchesInView={matchesInView}
            isFilterActive={Boolean(selectedGroup !== 'ALL' || selectedTeam || selectedMatchId)}
            onReset={() => { setSelectedGroup('ALL'); setSelectedTeam(''); setSelectedWeek(1); setSelectedMatchId(''); }}
          />

          {!selectedMatchId ? (
            <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
              Pilih pertandingan pada filter di atas untuk memulai.
            </div>
          ) : loadingReport ? (
            <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
              Memuat data pertandingan...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scoreboard Interaktif: Murni Berdasarkan State Games/Report Aktif */}
              <ReportScoreboard
                teamA={{ name: activeMatch?.teamAName, repeatsUsed: repeatsA, warningsUsed: warnsA }}
                teamB={{ name: activeMatch?.teamBName, repeatsUsed: repeatsB, warningsUsed: warnsB }}
                scoreA={scoreA}
                scoreB={scoreB}
                teamALogo={activeMatch?.teamALogo}
                teamBLogo={activeMatch?.teamBLogo}
                metadata={{
                  week: activeMatch?.weekNumber || selectedWeek,
                  matchNumber: activeMatch?.id?.replace(/\D/g, '') || 1,
                  division: activeMatch?.groupName,
                  referee: activeMatch?.referee || '-',
                  streamer: activeMatch?.streamer || '-',
                  date: activeMatch?.matchDate ? activeMatch.matchDate.split('T')[0] : '-',
                }}
              />

              <EditorHeader
                currentTab={editorTab}
                onTabChange={setEditorTab}
                gameCount={games.length}
                isSaving={saving}
                onSave={handleSaveToDatabase}
                statusMsg={statusMsg}
              />

              {editorTab === 'lineup' && (
                <EditorLineup
                  teamAName={activeMatch?.teamAName}
                  teamBName={activeMatch?.teamBName}
                  teamALineup={teamALineup}
                  teamBLineup={teamBLineup}
                  rosterA={rosterA}
                  rosterB={rosterB}
                  masterDecks={masterDecks}
                  masterSkills={masterSkills}
                  onChange={handleLineupChange}
                  onSelectRoster={handleSelectRoster}
                />
              )}

              {editorTab === 'game' && (
                <EditorRunner
                  teamAName={activeMatch?.teamAName}
                  teamBName={activeMatch?.teamBName}
                  teamALineup={teamALineup}
                  teamBLineup={teamBLineup}
                  games={games}
                  scoreA={scoreA}
                  scoreB={scoreB}
                  onAddGame={handleAddGame}
                  onRollbackGame={handleRollbackGame}
                />
              )}

              {editorTab === 'preview' && (
                <div className="space-y-4">
                  <ReportLineup
                    lineupA={teamALineup}
                    lineupB={teamBLineup}
                    games={games}
                    isFinished={scoreA >= 10 || scoreB >= 10}
                    isMatchStarted={true}
                  />
                  <ReportLogs games={games} isFinished={scoreA >= 10 || scoreB >= 10} isMatchStarted={true} />
                </div>
              )}
            </div>
          )}
        </section>

        <Footer />
      </div>
    </main>
  );
              }
