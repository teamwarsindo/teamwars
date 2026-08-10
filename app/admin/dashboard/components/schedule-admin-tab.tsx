'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { MatchAdminCard } from './match-admin-card';
import { ChevronDown, Check, RotateCcw, Radio } from 'lucide-react';
import Swal from 'sweetalert2';

interface StaffItem {
  discordId: string;
  discordName: string;
}

export function ScheduleAdminTab() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [refereeList, setRefereeList] = useState<StaffItem[]>([]);
  const [streamerList, setStreamerList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter Week dengan Tipe Data Number | 'ALL' (Konsisten dengan ScheduleTab)
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>('ALL');
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const weekDropdownRef = useRef<HTMLDivElement>(null);

  const fetchSchedulesAndStaff = async () => {
    try {
      const [resSched, resStaff] = await Promise.all([
        fetch('/api/tournament'),
        fetch('/api/tournament/staff'),
      ]);
      const dataSched = await resSched.json();
      const dataStaff = await resStaff.json();

      if (dataSched?.schedules) setSchedules(dataSched.schedules);
      if (dataStaff?.success) {
        setRefereeList(dataStaff.referees || []);
        setStreamerList(dataStaff.streamers || []);
      }
    } catch (err) {
      console.error('Error fetching schedules/staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesAndStaff();
  }, []);

  // Tutup dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ambil Angka Minggu Unik
  const availableWeeks = useMemo(() => {
    if (!schedules?.length) return [];
    return Array.from(
      new Set(schedules.map((m) => Number(m.weekNumber) || 1))
    ).sort((a, b) => a - b);
  }, [schedules]);

  // Logika Filter Minggu
  const filteredSchedules = useMemo(() => {
    if (selectedWeek === 'ALL') return schedules;
    return schedules.filter((m) => (Number(m.weekNumber) || 1) === selectedWeek);
  }, [schedules, selectedWeek]);

  const handleSaveMatchSchedule = async (updated: MatchScheduleItem) => {
    const res = await fetch('/api/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UPDATE_MATCH_CONSOLE', matchId: updated.id, token: 'tsaqif', matchData: updated }),
    });
    if (res.ok) {
      await fetchSchedulesAndStaff();
      Swal.fire({ icon: 'success', title: 'Jadwal Disimpan!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
    }
  };

  const handleSyncSingleMatch = async (match: MatchScheduleItem) => {
    Swal.fire({ title: 'Syncing Match...', text: `Update Discord ${match.teamAName} vs ${match.teamBName}`, didOpen: () => Swal.showLoading() });
    const res = await fetch('/api/tournament/sync-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, weekName: `Week ${match.weekNumber || 1}` }),
    });
    if (res.ok) {
      await fetchSchedulesAndStaff();
      Swal.fire('Berhasil!', 'Match synced ke Discord!', 'success');
    }
  };

  const handleBroadcastRecap = async () => {
    if (selectedWeek === 'ALL') return;
    const targetWeekStr = `Week ${selectedWeek}`;
    const res = await Swal.fire({
      title: `Kelola Broadcast ${targetWeekStr}?`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Ya, Broadcast!',
      denyButtonText: 'Hapus Broadcast',
      confirmButtonColor: '#9333ea',
      denyButtonColor: '#e11d48',
    });

    const method = res.isConfirmed ? 'POST' : res.isDenied ? 'DELETE' : null;
    if (!method) return;

    Swal.fire({ title: 'Processing...', didOpen: () => Swal.showLoading() });
    const apiRes = await fetch('/api/tournament/weekly-recap', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWeek: targetWeekStr }),
    });
    if (apiRes.ok) {
      await fetchSchedulesAndStaff();
      Swal.fire('Selesai!', `Operasi ${targetWeekStr} berhasil!`, 'success');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">Memuat Jadwal Admin...</div>;

  return (
    <div className="space-y-4">
      {/* HEADER SECTION RESPONSIF */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Manajemen Schedule Pertandingan</h2>
          <p className="text-xs text-muted-foreground">Kelola waktu (WIB), Wasit, Streamer, dan otomatisasi channel Discord match.</p>
        </div>

        {/* KONTROL KANAN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2 w-full md:w-auto">
          
          <button
            onClick={async () => {
              Swal.fire({ title: 'Refreshing...', didOpen: () => Swal.showLoading() });
              await fetch('/api/tournament/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REFRESH_STAFF_ASSIGNMENTS' }) });
              await fetchSchedulesAndStaff();
              Swal.fire({ icon: 'success', title: 'Staf Di-refresh!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
            }}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Refresh Staf KV</span>
          </button>

          {/* CUSTOM DROPDOWN FILTER MINGGU */}
          <div className="relative w-full sm:w-auto min-w-[200px]" ref={weekDropdownRef}>
            <button
              type="button"
              onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
              className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-bold text-primary flex items-center justify-between transition hover:border-primary shadow-2xs cursor-pointer"
            >
              <span className="truncate">
                {selectedWeek === 'ALL'
                  ? `Semua Minggu (${schedules.length} Match)`
                  : `Week ${selectedWeek} (${filteredSchedules.length} Match)`}
              </span>
              <ChevronDown className={`h-4 w-4 text-primary transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isWeekDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWeek('ALL');
                    setIsWeekDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedWeek === 'ALL'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-popover-foreground hover:bg-accent'
                  }`}
                >
                  <span>Semua Minggu ({schedules.length} Match)</span>
                  {selectedWeek === 'ALL' && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/40" />

                {availableWeeks.map((wNum) => {
                  const matchCount = schedules.filter((m) => (Number(m.weekNumber) || 1) === wNum).length;
                  return (
                    <button
                      key={wNum}
                      type="button"
                      onClick={() => {
                        setSelectedWeek(wNum);
                        setIsWeekDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        selectedWeek === wNum
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-popover-foreground hover:bg-accent'
                      }`}
                    >
                      <span>Week {wNum} ({matchCount} Match)</span>
                      {selectedWeek === wNum && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedWeek !== 'ALL' && (
            <button
              onClick={handleBroadcastRecap}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Broadcast Recap (Week {selectedWeek})</span>
            </button>
          )}

        </div>
      </div>

      {/* LIST KARTU PERTANDINGAN */}
      <div className="grid grid-cols-1 gap-4">
        {filteredSchedules.map((match) => (
          <MatchAdminCard
            key={match.id}
            match={match}
            refereeList={refereeList}
            streamerList={streamerList}
            onSave={handleSaveMatchSchedule}
            onSync={handleSyncSingleMatch}
            onDeleteChannel={async (m) => {
              const confirm = await Swal.fire({ title: `Hapus Channel ${m.id}?`, icon: 'warning', showCancelButton: true });
              if (!confirm.isConfirmed) return;
              await fetch('/api/tournament/delete-channel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: m.id }) });
              await fetchSchedulesAndStaff();
              Swal.fire('Berhasil!', 'Channel dihapus', 'success');
            }}
            onCopyLink={(m) => {
              if (!m.refereeToken) return Swal.fire('Token Kosong', 'Klik Sync terlebih dahulu.', 'warning');
              const magicUrl = `${window.location.origin}/tournament/match-input/${m.id}?token=${m.refereeToken}`;
              navigator.clipboard.writeText(magicUrl);
              Swal.fire({ icon: 'success', title: 'Magic Link Disalin!', text: magicUrl, timer: 1500, showConfirmButton: false });
            }}
          />
        ))}
      </div>
    </div>
  );
  }
      
