'use client';

import { Suspense, useMemo } from 'react';
import { TopBar, HeroHeader, Footer } from '@/components/layout-shared';
import { AnalyticsFilter } from '@/app/analytics/_components/analytics-filter';
import { ReportScoreboard } from '@/app/analytics/_components/report-scoreboard';
import { ReportLineup } from '@/app/analytics/_components/report-lineup';
import { ReportLogs } from '@/app/analytics/_components/report-logs';

import { EditorHeader } from './_components/editor-header';
import { EditorLineup } from './_components/editor-lineup';
import { EditorRunner } from './_components/editor-runner';
import { RefereeLinkBanner } from './_components/referee-link-banner';
import { useMatchReport } from './use-match-report';
import { useMatchEditorPage } from './use-match-editor-page';

function MatchReportContent() {
  const {
    isRefereeMode,
    teams,
    selectedGroup,
    setSelectedGroup,
    selectedTeam,
    setSelectedTeam,
    selectedWeek,
    setSelectedWeek,
    selectedMatchId,
    setSelectedMatchId,
    editorTab,
    setEditorTab,
    activeMatch,
    matchesInView,
    scheduleDateInfo,
    resolvedMatchNumber,
  } = useMatchEditorPage();

  const report = useMatchReport(selectedMatchId, activeMatch, selectedWeek);
  const isFinished = useMemo(() => report.scoreA >= 10 || report.scoreB >= 10, [report.scoreA, report.scoreB]);
  const isStarted = useMemo(() => report.games.length > 0 || report.scoreA > 0 || report.scoreB > 0, [report.games.length, report.scoreA, report.scoreB]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title={isRefereeMode ? 'Referee Match Editor' : 'Interactive Report Editor'} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-3 sm:px-6 pb-12">
        <HeroHeader showDetails={false} />

        <section className="w-full max-w-4xl space-y-4">
          {!isRefereeMode ? (
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
          ) : (
            <RefereeLinkBanner isRefereeMode={true} selectedMatchId={selectedMatchId} />
          )}

          {!selectedMatchId ? (
            <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border shadow-xs">
              {isRefereeMode ? 'Memuat pertandingan dari token wasit...' : 'Pilih pertandingan pada filter di atas untuk memulai.'}
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
                  streamUrl: activeMatch?.streamUrl || '',
                }}
              />

              {!isRefereeMode && <RefereeLinkBanner isRefereeMode={false} selectedMatchId={selectedMatchId} />}

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
                  onChangeLineup={(side, list) => side === 'A' ? report.setTeamALineup(list) : report.setTeamBLineup(list)}
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
                <div className="space-y-4 animate-in fade-in duration-150">
                  <ReportLineup
                    lineupA={report.teamALineup}
                    lineupB={report.teamBLineup}
                    games={report.games}
                    isFinished={isFinished}
                    isMatchStarted={isStarted}
                  />
                  <ReportLogs games={report.games} isFinished={isFinished} isMatchStarted={isStarted} />
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

export default function AdminInteractiveMatchReport() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-bold">Memuat Editor...</div>}>
      <MatchReportContent />
    </Suspense>
  );
}
