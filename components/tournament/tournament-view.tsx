'use client';

import { useState, useEffect } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { MatchReportModal } from './match-report-modal';
import { Calendar, Trophy, Eye, Filter, RefreshCw } from 'lucide-react';

interface TournamentViewProps {
  isAdmin: boolean;
  selectedGroupFilter: 'ALL' | 'Group A' | 'Group B';
  setSelectedGroupFilter: (val: 'ALL' | 'Group A' | 'Group B') => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (val: string) => void;
}

export function TournamentView({
  isAdmin,
  selectedGroupFilter,
  setSelectedGroupFilter,
  selectedDateFilter,
  setSelectedDateFilter,
}: TournamentViewProps) {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tournament');
      const data = await res.json();
      if (data && Array.isArray(data.schedules)) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error('Gagal fetch jadwal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const filteredSchedules = schedules.filter((m) => {
    const matchGroup = selectedGroupFilter === 'ALL' ? true : m.groupName === selectedGroupFilter;
    const matchDate = !selectedDateFilter ? true : m.matchDate.startsWith(selectedDateFilter);
    return matchGroup && matchDate;
  });

  const handleSavedMatch = (updatedMatch: MatchScheduleItem) => {
    setSchedules((prev) => prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)));
  };

  return (
    <div className="w-full space-y-6">
      {/* FILTER BAR INOVATIF */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Jadwal</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value as any)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none"
          >
            <option value="ALL">Semua Grup (A & B)</option>
            <option value="Group A">Group A</option>
            <option value="Group B">Group B</option>
          </select>

          <input
            type="date"
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none"
          />

          <button
            onClick={fetchSchedules}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* DAFTAR JADWAL PERTANDINGAN */}
      {isLoading ? (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border bg-card/40">
          <p className="animate-pulse text-xs font-bold text-primary">⏳ Memuat Jadwal & Skor Pertandingan...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/20">
          <p className="text-xs font-semibold text-muted-foreground">Jadwal pertandingan tidak ditemukan untuk filter ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredSchedules.map((match) => (
            <div
              key={match.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card/80 p-5 shadow-lg transition hover:border-primary/50"
            >
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {match.groupName} — Week {match.weekNumber || 1}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <Calendar className="h-3 w-3" />
                  {formatScheduleDate(match.matchDate)}
                </span>
              </div>

              {/* TIM A VS TIM B WITH SCORE */}
              <div className="my-2 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <img src={match.teamALogo} alt={match.teamAName} className="h-10 w-10 rounded-xl object-cover border border-border" />
                  <span className="font-extrabold text-sm text-foreground truncate max-w-[120px]">{match.teamAName}</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-background border border-border px-4 py-1.5 font-black text-base text-primary">
                  <span>{match.scoreA}</span>
                  <span className="text-muted-foreground">:</span>
                  <span>{match.scoreB}</span>
                </div>

                <div className="flex flex-1 items-center justify-end gap-3 text-right">
                  <span className="font-extrabold text-sm text-foreground truncate max-w-[120px]">{match.teamBName}</span>
                  <img src={match.teamBLogo} alt={match.teamBName} className="h-10 w-10 rounded-xl object-cover border border-border" />
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[10px] text-muted-foreground">
                  Ref: <strong className="text-foreground">{match.referee}</strong>
                </span>

                <button
                  onClick={() => setSelectedMatch(match)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {isAdmin ? 'Edit / Match Report' : 'Lihat Match Report'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL MATCH REPORT EKSKLUSIF */}
      <MatchReportModal
        match={selectedMatch}
        isAdmin={isAdmin}
        onClose={() => setSelectedMatch(null)}
        onSaved={handleSavedMatch}
      />
    </div>
  );
}

function formatScheduleDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch {
    return isoStr;
  }
}
