'use client';

import { Suspense, use, useState, useEffect, useMemo } from 'react';
import { TopBar, HeroHeader, Footer } from '@/components/layout-shared';
import { ReportScoreboard } from '@/app/analytics/_components/report-scoreboard';
import { ReportLineup } from '@/app/analytics/_components/report-lineup';
import { ReportLogs } from '@/app/analytics/_components/report-logs';

import { EditorHeader } from '../_components/editor-header';
import { EditorLineup } from '../_components/editor-lineup';
import { EditorRunner } from '../_components/editor-runner';
import { useMatchReport } from '../use-match-report';

interface PageProps {
  params: Promise<{ token: string }>;
}

function RefereeEditorContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token || '';

  const [matchId, setMatchId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [editorTab, setEditorTab] = useState<'lineup' | 'game' | 'preview'>('lineup');

  // Verifikasi token wasit & ambil data pertandingan terkait
  useEffect(() => {
    if (!token) {
      setAuthError('Token akses wasit tidak ditemukan.');
      setLoadingAuth(false);
      return;
    }

    fetch(`/api/admin/match-report/token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.matchId) {
          setMatchId(res.matchId);
          return fetch('/api/admin/match-report')
            .then((r) => r.json())
            .then((data) => {
              const target = (data?.schedules || []).find((s: any) => s.id === res.matchId);
              if (target) {
                setActiveMatch(target);
              } else {
                setAuthError('Jadwal pertandingan tidak ditemukan.');
              }
            });
        } else {
          setAuthError('Token akses tidak valid atau sudah kedaluwarsa.');
        }
      })
      .catch(() => setAuthError('Gagal memverifikasi akses wasit.'))
      .finally(() => setLoadingAuth(false));
  }, [token]);

  const report = useMatchReport(matchId || '', activeMatch, activeMatch?.weekNumber || 1);
  const isFinished = useMemo(() => report.scoreA >= 10 || report.scoreB >= 10, [report.scoreA, report.scoreB]);
  const isStarted = useMemo(
    () => report.games.length > 0 || report.scoreA > 0 || report.scoreB > 0,
    [report.games.length, report.scoreA, report.scoreB]
  );

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

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground space-y-2">
        <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-muted-foreground">Memverifikasi Otoritas Wasit...</span>
      </div>
    );
  }

  if (authError || !matchId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center space-y-3">
        <div className="text-3xl">🚫</div>
        <h1 className="text-sm font-black text-rose-600 uppercase">Akses Ditolak</h1>
        <p className="text-xs text-muted-foreground max-w-xs">{authError || 'Pertandingan tidak dapat diakses.'}</p>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Referee Official Match Editor" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-3 sm:px-6 pb-12">
        <HeroHeader showDetails={false} />

        <section className="w-full max-w-4xl space-y-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-2xs">
            <span className="flex items-center gap-2">
              <span>🛡️</span>
              <span>Pertandingan Terkunci Resmi (Wasit: {activeMatch?.referee || 'Official'})</span>
            </span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-emerald-500/20">
              Verified
            </span>
          </div>

          <div className="space-y-4">
            <ReportScoreboard
              teamA={{ name: activeMatch?.teamAName, repeatsUsed: report.repeatsA, warningsUsed: report.warnsA }}
              teamB={{ name: activeMatch?.teamBName, repeatsUsed: report.repeatsB, warningsUsed: report.warnsB }}
              scoreA={report.scoreA}
              scoreB={report.scoreB}
              teamALogo={activeMatch?.teamALogo}
              teamBLogo={activeMatch?.teamBLogo}
              metadata={{
                matchNumber: activeMatch?.matchNumber || matchId.replace(/\D/g, '') || 1,
                division: activeMatch?.groupName,
                week: activeMatch?.weekNumber || 1,
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
        </section>

        <Footer />
      </div>
    </main>
  );
}

export default function RefereeDedicatedPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-bold">Memuat Editor Wasit...</div>}>
      <RefereeEditorContent params={params} />
    </Suspense>
  );
    }
                                   
