'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { PlayerLineup, createEmptyPlayer } from './_types';
import MatchBanner from './_components/match-banner';
import LineupTab from './_components/lineup-tab';
import GameTab from './_components/game-tab';

export default function AdminMatchReportPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [matchData, setMatchData] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'game'>('submit');

  const [lineupA, setLineupA] = useState<PlayerLineup[]>(Array(5).fill(null).map(createEmptyPlayer));
  const [lineupB, setLineupB] = useState<PlayerLineup[]>(Array(5).fill(null).map(createEmptyPlayer));

  useEffect(() => {
    fetch('/api/admin/match-report')
      .then((res) => res.json())
      .then((data) => {
        if (data.schedules) setSchedules(data.schedules);
      });
  }, []);

  const loadMatch = async (matchId: string) => {
    setSelectedMatchId(matchId);
    if (!matchId) {
      setMatchData(null);
      setReport(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/match-report?matchId=${matchId}`);
      const data = await res.json();
      setMatchData(data.match);
      setReport(data.report);

      setLineupA(data.report?.teamA?.lineup?.length ? data.report.teamA.lineup : Array(5).fill(null).map(createEmptyPlayer));
      setLineupB(data.report?.teamB?.lineup?.length ? data.report.teamB.lineup : Array(5).fill(null).map(createEmptyPlayer));
    } finally {
      setLoading(false);
    }
  };

  const handleLineupAction = async (action: 'save' | 'publish') => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/match-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: selectedMatchId, teamALineup: lineupA, teamBLineup: lineupB, action }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReport(data.report);

      Swal.fire({
        icon: 'success',
        title: action === 'publish' ? 'Lineup Terpublikasi!' : 'Draft Tersimpan!',
        text: action === 'publish' ? 'Lineup tersimpan & Tracker Camp Discord ter-update.' : 'Lineup berhasil disimpan ke draft KV.',
      });
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (params: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/match-report', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: selectedMatchId, action: 'add_game', ...params }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReport(data.report);

      Swal.fire({
        icon: 'success',
        title: params.shouldPublish ? 'Game Berhasil Dipublish!' : 'Game Disimpan (Draft)!',
        text: params.shouldPublish ? 'Log dikirim ke Discord & Tracker Camp dicoret.' : 'Ronde duel tersimpan di database draft.',
      });
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    const confirm = await Swal.fire({
      title: 'Rollback Game Terakhir?',
      text: 'Skor dan status coretan deck duel terakhir akan dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Rollback & Publish Sync',
    });
    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/match-report', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: selectedMatchId, action: 'del_game', shouldPublish: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReport(data.report);
      Swal.fire('Sukses', 'Game terakhir berhasil di-rollback!', 'success');
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">⚔️ Match Operations (/submit & /game)</h1>
          <p className="text-slate-400 text-xs mt-0.5">Kelola formasi pemain, deck, dan kontrol skor duel secara modular.</p>
        </div>
        <div className="w-full md:w-80">
          <select
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
            value={selectedMatchId}
            onChange={(e) => loadMatch(e.target.value)}
          >
            <option value="">-- Pilih Pertandingan --</option>
            {schedules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id.toUpperCase()} | {m.teamAName} vs {m.teamBName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedMatchId && matchData && (
        <>
          <MatchBanner
            teamAName={matchData.teamAName}
            teamBName={matchData.teamBName}
            scoreA={report?.teamA?.score ?? 0}
            scoreB={report?.teamB?.score ?? 0}
          />

          <div className="flex border-b border-slate-800 space-x-4">
            <button
              onClick={() => setActiveTab('submit')}
              className={`pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === 'submit' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              👥 1. Lineup & Deck (/submit)
            </button>
            <button
              onClick={() => setActiveTab('game')}
              className={`pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === 'game' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              🎮 2. Ronde Duel (/game)
            </button>
          </div>

          {activeTab === 'submit' ? (
            <LineupTab
              teamAName={matchData.teamAName}
              teamBName={matchData.teamBName}
              lineupA={lineupA}
              setLineupA={setLineupA}
              lineupB={lineupB}
              setLineupB={setLineupB}
              loading={loading}
              onAction={handleLineupAction}
            />
          ) : (
            <GameTab
              teamAName={matchData.teamAName}
              teamBName={matchData.teamBName}
              report={report}
              loading={loading}
              onAddGame={handleAddGame}
              onRollback={handleRollback}
            />
          )}
        </>
      )}
    </div>
  );
      }
