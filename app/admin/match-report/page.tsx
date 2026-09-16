'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar, HeroHeader, Footer } from '@/components/layout-shared';
import { DIVISION_MAP } from '@/app/tournament/_library';
import { AnalyticsFilter } from '@/app/analytics/_components/analytics-filter';
import { ReportScoreboard } from '@/app/analytics/_components/report-scoreboard';
import { ReportLineup } from '@/app/analytics/_components/report-lineup';
import { ReportLogs } from '@/app/analytics/_components/report-logs';

import { EditorHeader } from './_components/editor-header';
import { EditorLineup } from './_components/editor-lineup';
import { EditorRunner } from './_components/editor-runner';
import { useMatchReport } from './use-match-report';

export default function AdminInteractiveMatchReport() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B>('ALL');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | ''>(1);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [editorTab, setEditorTab] = useState<'lineup' | 'game' | 'preview'>('lineup');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/match-report').then((r) => r.json()),
      fetch('/api/tournament/teams').then((r) => r.json()).catch(() => ({ teams: [] })),
    ]).then(([schedRes, teamRes]) => {
      if (schedRes.schedules) setSchedules(schedRes.schedules);
      if (teamRes.teams) setTeams(teamRes.teams);
    });
  }, []);

  const activeMatch = useMemo(() => schedules.find((s) => s.id === selectedMatchId), [schedules, selectedMatchId]);
  const matchesInView = useMemo(() => schedules.filter((s) => {
    if (selectedGroup !== 'ALL' && s.groupName !== selectedGroup) return false;
    if (selectedWeek !== '' && Number(s.weekNumber) !== Number(selectedWeek)) return false;
    if (selectedTeam !== '' && s.teamAName !== selectedTeam && s.teamBName !== selectedTeam) return false;
    return true;
  }), [schedules, selectedGroup, selectedWeek, selectedTeam]);

  const report = useMatchReport(selectedMatchId, activeMatch, selectedWeek);

  const scheduleDateInfo = useMemo(() => {
    const raw = activeMatch?.matchDate;
    if (!raw) return { day: '-', date: '-', time: '-' };
    try {
      const d = new Date(raw);
      const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(d);
      const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d);
      const timeStr = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(d);
      return { day, date, time: `${timeStr.replace(':', '.')} WIB` };
    } catch {
      return { day: '-', date: raw, time: '-' };
    }
  }, [activeMatch?.matchDate]);

  const resolvedMatchNumber = useMemo(() => {
    if (activeMatch?.matchNumber) return activeMatch.matchNumber;
    if (selectedMatchId) {
      const extracted = selectedMatchId.replace(/\D/g, '');
      if (extracted) return extracted;
    }
    return 1;
  }, [activeMatch?.matchNumber, selectedMatchId]);

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
            onMatchChange={setSelectedMatchId}
            matchesInView={matchesInView}
            isFilterActive={Boolean(selectedGroup !== 'ALL' || selectedTeam || selectedMatchId)}
            onReset={() => { setSelectedGroup('ALL'); setSelectedTeam(''); setSelectedWeek(1); setSelectedMatchId(''); }}
          />

          {!selectedMatchId ? (
            <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
              Pilih pertandingan pada filter di atas untuk memulai.
            </div>
          ) : report.loading ? (
            <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
              Memuat data pertandingan...
            </div>
          ) : (
            <div className="space-y-4">
              <ReportScoreboard
                teamA={{ name: activeMatch?.teamAName, repeatsUsed: report.repeatsA, warningsUsed: report.warnsA }}
                teamB={{ name: activeMatch?.teamBName, repeatsUsed: report.repeatsB, warningsUsed: report.warnsB }}
                scoreA={report.scoreA}
                scoreB={report.scoreB}
                teamALogo={activeMatch?.teamALogo}
                teamBLogo={activeMatch?.teamBLogo}
                metadata={{
                  matchNumber: resolvedMatchNumber,
                  division: activeMatch?.groupName,
                  week: activeMatch?.weekNumber || selectedWeek,
                  day: scheduleDateInfo.day,
                  date: scheduleDateInfo.date,
                  time: scheduleDateInfo.time,
                  referee: activeMatch?.referee || '-',
                  streamer: activeMatch?.streamer || '-',
                }}
              />

              <EditorHeader
                currentTab={editorTab}
                onTabChange={setEditorTab}
                gameCount={report.games.length}
                isSaving={report.saving}
                onSave={report.handleSaveToDatabase}
                statusMsg={report.statusMsg}
              />

              {editorTab === 'lineup' && (
                <EditorLineup
                  teamAName={activeMatch?.teamAName || 'Team A'}
                  teamBName={activeMatch?.teamBName || 'Team B'}
                  teamALineup={report.teamALineup}
                  teamBLineup={report.teamBLineup}
                  rosterA={report.rosterA}
                  rosterB={report.rosterB}
                  masterDecks={report.masterDecks}
                  masterSkills={report.masterSkills}
                  masterArchetypes={report.masterArchetypes}
                  onChangeLineup={(side, list) => (side === 'A' ? report.setTeamALineup(list) : report.setTeamBLineup(list))}
                  onRefreshMeta={() => report.fetchMeta(activeMatch?.teamAName, activeMatch?.teamBName)}
                />
              )}

              {editorTab === 'game' && (
                <EditorRunner
                  teamAName={activeMatch?.teamAName}
                  teamBName={activeMatch?.teamBName}
                  teamALogo={activeMatch?.teamALogo}
                  teamBLogo={activeMatch?.teamBLogo}
                  teamALineup={report.teamALineup}
                  teamBLineup={report.teamBLineup}
                  repeatsA={report.repeatsA}
                  repeatsB={report.repeatsB}
                  games={report.games}
                  scoreA={report.scoreA}
                  scoreB={report.scoreB}
                  onAddGame={report.handleAddGame}
                  onRollbackGame={report.handleRollbackGame}
                />
              )}

              {editorTab === 'preview' && (
                <div className="space-y-4">
                  <ReportLineup
                    lineupA={report.teamALineup}
                    lineupB={report.teamBLineup}
                    games={report.games}
                    isFinished={report.scoreA >= 10 || report.scoreB >= 10}
                    isMatchStarted={true}
                  />
                  <ReportLogs games={report.games} isFinished={report.scoreA >= 10 || report.scoreB >= 10} isMatchStarted={true} />
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
