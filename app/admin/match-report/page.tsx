'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const isRefereeMode = Boolean(tokenParam);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B>('ALL');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | ''>(1);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [editorTab, setEditorTab] = useState<'lineup' | 'game' | 'preview'>('lineup');

  // Fetch Master Schedule & Teams
  const fetchInitialData = useCallback(() => {
    Promise.all([
      fetch('/api/admin/match-report', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/tournament/teams', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ]).then(([schedRes, teamRes]) => {
      const schedList = schedRes?.schedules || [];
      if (schedList.length > 0) setSchedules(schedList);

      const apiTeams = Array.isArray(teamRes) ? teamRes : teamRes?.teams || teamRes?.data || [];
      if (apiTeams.length > 0) {
        setTeams(apiTeams);
      } else if (schedList.length > 0) {
        const map = new Map<string, any>();
        schedList.forEach((s: any) => {
          if (s.teamAName && !map.has(s.teamAName)) map.set(s.teamAName, { name: s.teamAName, slug: s.teamASlug, groupName: s.groupName, logo: s.teamALogo });
          if (s.teamBName && !map.has(s.teamBName)) map.set(s.teamBName, { name: s.teamBName, slug: s.teamBSlug, groupName: s.groupName, logo: s.teamBLogo });
        });
        setTeams(Array.from(map.values()));
      }
    });
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Otomatis verifikasi dan kunci pertandingan jika dibuka lewat link wasit (/t-:token)
  useEffect(() => {
    if (tokenParam) {
      fetch(`/api/admin/match-report/token?token=${tokenParam}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.matchId) {
            setSelectedMatchId(res.matchId);
          }
        })
        .catch(console.error);
    }
  }, [tokenParam]);

  const activeMatch = useMemo(() => schedules.find((s) => s.id === selectedMatchId), [schedules, selectedMatchId]);
  const matchesInView = useMemo(() => schedules.filter((s) => {
    if (selectedGroup !== 'ALL' && s.groupName !== selectedGroup) return false;
    if (selectedWeek !== '' && Number(s.weekNumber) !== Number(selectedWeek)) return false;
    if (selectedTeam !== '' && s.teamAName !== selectedTeam && s.teamBName !== selectedTeam) return false;
    return true;
  }), [schedules, selectedGroup, selectedWeek, selectedTeam]);

  const report = useMatchReport(selectedMatchId, activeMatch, selectedWeek);

  // Status Laga
  const isFinished = useMemo(() => {
    return report.scoreA >= 10 || report.scoreB >= 10;
  }, [report.scoreA, report.scoreB]);

  const isMatchStarted = useMemo(() => {
    return report.games.length > 0 || report.scoreA > 0 || report.scoreB > 0;
  }, [report.games.length, report.scoreA, report.scoreB]);

  // Format Tanggal WIB
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

  // Pemetaan Skill Abbreviation agar identik dengan Analytics Live Report
  const previewGames = useMemo(() => {
    return report.games.map((g: any) => {
      const findAbbr = (rawSkill: string) => {
        if (!rawSkill) return '-';
        const target = rawSkill.trim().toLowerCase();
        const matched = report.masterSkills.find(
          (s) =>
            s.name?.trim().toLowerCase() === target ||
            s.label?.trim().toLowerCase() === target ||
            s.code?.trim().toLowerCase() === target
        );
        return matched?.code || rawSkill;
      };

      return {
        ...g,
        playerA: {
          ...g.playerA,
          skillAbbr: findAbbr(g.playerA?.skill),
        },
        playerB: {
          ...g.playerB,
          skillAbbr: findAbbr(g.playerB?.skill),
        },
      };
    });
  }, [report.games, report.masterSkills]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title={isRefereeMode ? "Referee Match Editor" : "Interactive Report Editor"} />

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
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🛡️</span>
                <span>Akses Pengisian Wasit Resmi</span>
              </span>
              <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-700 dark:text-sky-300">
                Referee Token Active
              </span>
            </div>
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
                  teamALineup={report.teamALineup}
                  teamBLineup={report.teamBLineup}
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
                    isMatchStarted={isMatchStarted}
                  />

                  <ReportLogs
                    games={previewGames}
                    isFinished={isFinished}
                    isMatchStarted={isMatchStarted}
                  />
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
