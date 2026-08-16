'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MatchScheduleItem, DIVISION_MAP } from '@/lib/tournament';
import { MatchAdminCard } from './match-admin-card';
import { ChevronDown, Check, RotateCcw, Radio, Zap } from 'lucide-react';
import Swal from 'sweetalert2';

interface StaffItem {
  discordId: string;
  discordName: string;
}

interface ScheduleAdminTabProps {
  groupAName?: string;
  groupBName?: string;
}

// 🟢 HELPER HITUNG WEEK BERDASARKAN TANGGAL MATCH JIKA KV KOSONG
function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = new Date('2026-08-03T00:00:00+07:00').getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function ScheduleAdminTab({
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
}: ScheduleAdminTabProps) {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [refereeList, setRefereeList] = useState<StaffItem[]>([]);
  const [streamerList, setStreamerList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 STATE FILTER MINGGU
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'ALL'>('ALL');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'ALL' | 'Group A' | 'Group B'>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');

  // State Popover Dropdown
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🟢 MAP SCHEDULES AGAR SETIAP MATCH MEMILIKI weekNumber RESMI
  const schedulesWithWeek = useMemo(() => {
    return schedules.map((m) => ({
      ...m,
      computedWeek: Number(m.weekNumber) || getMatchWeekNumber(m.matchDate),
    }));
  }, [schedules]);

  // 🟢 OPSI MINGGU UNIK
  const availableWeeksFilter = useMemo(() => {
    const allWeekNumbers = Array.from(
      new Set(schedulesWithWeek.map((s) => s.computedWeek))
    ).sort((a, b) => a - b);

    return allWeekNumbers.length > 0 ? allWeekNumbers : [1];
  }, [schedulesWithWeek]);

  // Ekstrak nama tim unik
  const allTeamNames = useMemo(() => {
    const teams = new Set<string>();
    schedules.forEach((m) => {
      if (m.teamAName) teams.add(m.teamAName);
      if (m.teamBName) teams.add(m.teamBName);
    });
    return Array.from(teams).sort();
  }, [schedules]);

  // 🟢 LOGIKA PENYARINGAN FIX
  const filteredSchedules = useMemo(() => {
    return schedulesWithWeek.filter((m) => {
      // Filter Minggu
      if (selectedWeekFilter !== 'ALL' && m.computedWeek !== selectedWeekFilter) {
        return false;
      }

      // Filter Divisi
      if (selectedGroupFilter !== 'ALL') {
        const isGroupA = m.groupName === 'Group A' || m.groupName === groupAName;
        const targetIsA = selectedGroupFilter === 'Group A';
        if (isGroupA !== targetIsA) return false;
      }

      // Filter Tim
      if (
        selectedTeamFilter !== 'ALL' &&
        m.teamAName !== selectedTeamFilter &&
        m.teamBName !== selectedTeamFilter
      ) {
        return false;
      }

      return true;
    });
  }, [schedulesWithWeek, selectedWeekFilter, selectedGroupFilter, selectedTeamFilter, groupAName]);

  const handleResetFilters = () => {
    setSelectedWeekFilter('ALL');
    setSelectedGroupFilter('ALL');
    setSelectedTeamFilter('ALL');
  };

  // 🟢 HANDLE SAVE QUICK EDIT (OTOMATIS SINKRON KE REDIS KV, WASIT/STREAMER ROLE, & DISCORD EMBED)
  const handleSaveMatchSchedule = async (updated: MatchScheduleItem) => {
    Swal.fire({
      title: 'Menyimpan & Syncing...',
      text: 'Memperbarui data match dan menyinkronkan ke Discord...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MATCH_CONSOLE',
          matchId: updated.id,
          token: 'tsaqif',
          matchData: updated,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan perubahan ke server');
      }

      await fetchSchedulesAndStaff();

      Swal.fire({
        icon: 'success',
        title: 'Jadwal & Discord Disimpan!',
        text: `Match ${updated.id} berhasil diperbarui di Dashboard & Discord.`,
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error('Error saving match schedule:', err);
      Swal.fire('Gagal Menyimpan!', err.message || 'Terjadi kesalahan pada server.', 'error');
    }
  };

  const handleSyncSingleMatch = async (match: MatchScheduleItem) => {
    const mWeek = (match as any).computedWeek || match.weekNumber || getMatchWeekNumber(match.matchDate);
    Swal.fire({ title: 'Syncing Match...', text: `Update Discord ${match.teamAName} vs ${match.teamBName}`, didOpen: () => Swal.showLoading() });
    const res = await fetch('/api/tournament/sync-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, weekName: `Week ${mWeek}` }),
    });
    if (res.ok) {
      await fetchSchedulesAndStaff();
      Swal.fire('Berhasil!', 'Match synced ke Discord!', 'success');
    }
  };

  // ⚡ SYNC CHANNEL MASSAL UNTUK WEEK TERPILIH (BATCH VIA BACKEND API)
  const handleSyncWeekChannels = async () => {
    if (selectedWeekFilter === 'ALL') return;

    const targetWeekStr = `Week ${selectedWeekFilter}`;
    const weekMatches = filteredSchedules;

    if (weekMatches.length === 0) {
      return Swal.fire('Tidak Ada Match', `Tidak ada pertandingan ditemukan di ${targetWeekStr}`, 'info');
    }

    const confirm = await Swal.fire({
      title: `Buat Channel Discord ${targetWeekStr}?`,
      text: `Aplikasi akan menyinkronkan channel Discord untuk semua pertandingan di ${targetWeekStr}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Buat Channel Sekarang!',
      confirmButtonColor: '#16a34a',
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: `Memproses Channel ${targetWeekStr}...`,
      text: 'Mohon tunggu, sedang membuat channel di Discord...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch('/api/tournament/sync-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WEEK',
          targetWeek: targetWeekStr,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchSchedulesAndStaff();
        Swal.fire('Selesai!', `Berhasil menyinkronkan channel Discord untuk ${targetWeekStr}!`, 'success');
      } else {
        Swal.fire('Gagal!', data.error || `Gagal menyinkronkan channel ${targetWeekStr}.`, 'error');
      }
    } catch (err) {
      console.error(`Error sync week ${targetWeekStr}:`, err);
      Swal.fire('Error!', 'Terjadi kesalahan sistem saat menghubungi server.', 'error');
    }
  };

  const handleBroadcastRecap = async () => {
    if (selectedWeekFilter === 'ALL') return;
    const targetWeekStr = `Week ${selectedWeekFilter}`;
    const res = await Swal.fire({
      title: `Kelola Broadcast ${targetWeekStr}?`,
      text: `Menyiarkan pengumuman jadwal pertandingan untuk ${targetWeekStr} ke Discord.`,
      icon: 'question',
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
    } else {
      Swal.fire('Gagal!', `Gagal melakukan broadcast ${targetWeekStr}.`, 'error');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">Memuat Jadwal Admin...</div>;

  return (
    <div className="space-y-4">
      {/* HEADER & KONTROL PANEL ADMIN */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Manajemen Schedule Pertandingan</h2>
            <p className="text-xs text-muted-foreground">Kelola waktu (WIB), Wasit, Streamer, dan otomatisasi channel Discord match.</p>
          </div>

          <button
            onClick={async () => {
              Swal.fire({ title: 'Refreshing...', didOpen: () => Swal.showLoading() });
              await fetch('/api/tournament/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REFRESH_STAFF_ASSIGNMENTS' }) });
              await fetchSchedulesAndStaff();
              Swal.fire({ icon: 'success', title: 'Staf Di-refresh!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
            }}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Refresh Staf KV</span>
          </button>
        </div>

        {/* BARIS FILTER */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
          {/* 1. FILTER DIVISI */}
          <div className="grid grid-cols-3 gap-1 bg-background border border-input rounded-xl p-1">
            <button
              onClick={() => setSelectedGroupFilter('ALL')}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                selectedGroupFilter === 'ALL' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSelectedGroupFilter('Group A')}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer truncate ${
                selectedGroupFilter === 'Group A' ? 'bg-sky-500 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={groupAName}
            >
              {groupAName}
            </button>
            <button
              onClick={() => setSelectedGroupFilter('Group B')}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer truncate ${
                selectedGroupFilter === 'Group B' ? 'bg-amber-500 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={groupBName}
            >
              {groupBName}
            </button>
          </div>

          {/* 2. FILTER TIM */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Semua Tim</option>
            {allTeamNames.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* 3. DROPDOWN MINGGU */}
          <div className="relative" ref={weekDropdownRef}>
            <button
              type="button"
              onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
              className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {selectedWeekFilter === 'ALL'
                  ? `Semua Minggu (${schedulesWithWeek.length} Match)`
                  : `Week ${selectedWeekFilter} (${filteredSchedules.length} Match)`}
              </span>
              <ChevronDown className={`h-4 w-4 text-primary transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isWeekDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWeekFilter('ALL');
                    setIsWeekDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedWeekFilter === 'ALL'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-popover-foreground hover:bg-accent'
                  }`}
                >
                  <span>Semua Minggu ({schedulesWithWeek.length} Match)</span>
                  {selectedWeekFilter === 'ALL' && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/40" />

                {availableWeeksFilter.map((wNum) => {
                  const matchCount = schedulesWithWeek.filter((m) => m.computedWeek === wNum).length;
                  return (
                    <button
                      key={wNum}
                      type="button"
                      onClick={() => {
                        setSelectedWeekFilter(wNum);
                        setIsWeekDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        selectedWeekFilter === wNum
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-popover-foreground hover:bg-accent'
                      }`}
                    >
                      <span>Week {wNum} ({matchCount} Match)</span>
                      {selectedWeekFilter === wNum && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. TOMBOL RESET, SYNC CHANNEL & BROADCAST RECAP */}
          <div className="flex gap-1.5">
            <button
              onClick={handleResetFilters}
              className="py-2 px-2.5 rounded-xl bg-muted/40 hover:bg-muted text-foreground text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-border/50"
              title="Reset Filter"
            >
              <span>Reset</span>
            </button>

            {selectedWeekFilter !== 'ALL' && (
              <>
                <button
                  onClick={handleSyncWeekChannels}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  title={`Buat Channel Discord Semua Match Week ${selectedWeekFilter}`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Sync Ch. W{selectedWeekFilter}</span>
                </button>

                <button
                  onClick={handleBroadcastRecap}
                  className="py-2 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  title={`Broadcast Recap Week ${selectedWeekFilter}`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>Broadcast</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* LIST KARTU PERTANDINGAN */}
      <div className="grid grid-cols-1 gap-4">
        {filteredSchedules.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-muted-foreground bg-card border border-border rounded-2xl">
            Tidak ada jadwal pertandingan yang sesuai dengan filter.
          </div>
        ) : (
          filteredSchedules.map((match) => (
            <MatchAdminCard
              key={match.id}
              match={match}
              refereeList={refereeList}
              streamerList={streamerList}
              groupAName={groupAName}
              groupBName={groupBName}
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
          ))
        )}
      </div>
    </div>
  );
    }
