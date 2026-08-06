'use client';

import { useState, useEffect, useMemo } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';
import Swal from 'sweetalert2';

interface StaffItem {
  discordId: string;
  discordName: string;
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatISOToWIBInput(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false } as const;
  return new Intl.DateTimeFormat('sv-SE', options).format(d).replace(' ', 'T');
}

function formatWIBInputToISO(wibInputString: string): string {
  if (!wibInputString) return new Date().toISOString();
  return new Date(`${wibInputString}:00+07:00`).toISOString();
}

export function ScheduleAdminTab() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [refereeList, setRefereeList] = useState<StaffItem[]>([]);
  const [streamerList, setStreamerList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<MatchScheduleItem | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [isStaffRefreshing, setIsStaffRefreshing] = useState(false);

  const fetchSchedulesAndStaff = async () => {
    try {
      const [resSched, resStaff] = await Promise.all([
        fetch('/api/tournament'),
        fetch('/api/tournament/staff'),
      ]);

      const dataSched = await resSched.json();
      const dataStaff = await resStaff.json();

      if (dataSched && dataSched.schedules) setSchedules(dataSched.schedules);
      if (dataStaff && dataStaff.success) {
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

  const handleRefreshStaffList = async () => {
    setIsStaffRefreshing(true);
    try {
      const res = await fetch('/api/tournament/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REFRESH_STAFF_ASSIGNMENTS' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRefereeList(data.referees || []);
        setStreamerList(data.streamers || []);
        Swal.fire({ icon: 'success', title: 'Daftar Staf Di-refresh!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      }
    } catch {
      Swal.fire('Error', 'Gagal memuat ulang daftar staf', 'error');
    } finally {
      setIsStaffRefreshing(false);
    }
  };

  const schedulesWithWeek = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    const sortedByDate = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    const tournamentStartMonday = getMondayOfWeek(new Date(sortedByDate[0].matchDate));

    return schedules.map((m) => {
      const matchMonday = getMondayOfWeek(new Date(m.matchDate));
      const diffInDays = Math.round((matchMonday.getTime() - tournamentStartMonday.getTime()) / (1000 * 3600 * 24));
      return { ...m, calculatedWeekNumber: Math.floor(diffInDays / 7) + 1 };
    });
  }, [schedules]);

  const weekOptions = useMemo(() => {
    if (schedulesWithWeek.length === 0) return [];
    const weeksMap = new Map<number, typeof schedulesWithWeek>();
    schedulesWithWeek.forEach((m) => {
      const weekNum = m.calculatedWeekNumber;
      if (!weeksMap.has(weekNum)) weeksMap.set(weekNum, []);
      weeksMap.get(weekNum)?.push(m);
    });
    return Array.from(weeksMap.entries()).sort(([a], [b]) => a - b).map(([weekNum, matches]) => ({
      weekNum: `Week ${weekNum}`, weekNumber: weekNum, matches,
    }));
  }, [schedulesWithWeek]);

  const filteredSchedules = useMemo(() => {
    if (selectedWeek === 'ALL') return schedulesWithWeek;
    const weekNum = parseInt(selectedWeek.replace('Week ', ''), 10);
    return weekOptions.find((w) => w.weekNumber === weekNum)?.matches || schedulesWithWeek;
  }, [schedulesWithWeek, selectedWeek, weekOptions]);

  const handleSaveMatchSchedule = async (updated: MatchScheduleItem) => {
    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_MATCH_CONSOLE', matchId: updated.id, token: 'tsaqif', matchData: updated }),
      });
      if (res.ok) {
        await fetchSchedulesAndStaff();
        setEditingMatch(null);
        Swal.fire({ icon: 'success', title: 'Jadwal Berhasil Disimpan!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      }
    } catch {
      Swal.fire('Error', 'Gagal menyimpan perubahan jadwal', 'error');
    }
  };

  const handleSyncSingleMatch = async (match: MatchScheduleItem & { calculatedWeekNumber?: number }) => {
    Swal.fire({ title: 'Syncing Match...', text: `Memperbarui channel & embed di Discord untuk ${match.teamAName} vs ${match.teamBName}`, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch('/api/tournament/sync-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, weekName: `Week ${match.calculatedWeekNumber || 1}` }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSchedulesAndStaff();
        Swal.fire('Berhasil!', 'Match berhasil di-sync ke Discord!', 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal melakukan sync match', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  const handleBroadcastRecap = async () => {
    if (selectedWeek === 'ALL') {
      Swal.fire('Pilih Minggu', 'Silakan pilih minggu spesifik pada filter sebelum mengelola Weekly Recap.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: `Kelola Broadcast ${selectedWeek}?`,
      text: `Pilih aksi untuk embed Weekly Recap & Schedule pada channel Discord khusus.`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Ya, Broadcast!',
      denyButtonText: '🗑️ Hapus Broadcast',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#9333ea',
      denyButtonColor: '#e11d48',
    });

    if (result.isConfirmed) {
      setIsRecapLoading(true);
      Swal.fire({ title: `Broadcasting ${selectedWeek}...`, text: 'Mengirimkan Weekly Recap & Schedule...', didOpen: () => Swal.showLoading() });

      try {
        const res = await fetch('/api/tournament/weekly-recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetWeek: selectedWeek }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          await fetchSchedulesAndStaff();
          Swal.fire('Berhasil!', data.message || `Weekly Recap ${selectedWeek} berhasil disebarkan!`, 'success');
        } else {
          Swal.fire('Gagal', data.error || 'Gagal menyebarkan Weekly Recap', 'error');
        }
      } catch {
        Swal.fire('Error', 'Terjadi kesalahan koneksi', 'error');
      } finally {
        setIsRecapLoading(false);
      }
    } else if (result.isDenied) {
      setIsRecapLoading(true);
      Swal.fire({ title: `Menghapus Broadcast ${selectedWeek}...`, text: 'Menghapus embed utama dari Discord...', didOpen: () => Swal.showLoading() });

      try {
        const res = await fetch('/api/tournament/weekly-recap', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetWeek: selectedWeek }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          await fetchSchedulesAndStaff();
          Swal.fire('Berhasil Dihapus!', data.message || `Broadcast ${selectedWeek} berhasil dihapus dari Discord!`, 'success');
        } else {
          Swal.fire('Gagal', data.error || 'Gagal menghapus broadcast', 'error');
        }
      } catch {
        Swal.fire('Error', 'Terjadi kesalahan koneksi', 'error');
      } finally {
        setIsRecapLoading(false);
      }
    }
  };

  const handleDeleteChannel = async (match: MatchScheduleItem) => {
    const confirm = await Swal.fire({
      title: `Hapus Channel Discord ${match.id}?`,
      text: `Channel akan dihapus dari server Discord.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Channel!',
      cancelButtonText: 'Batal',
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({ title: 'Deleting Channel...', didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/tournament/delete-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSchedulesAndStaff();
        Swal.fire('Berhasil!', data.message, 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal menghapus channel', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
  };

  const handleCopyMagicLink = (match: MatchScheduleItem) => {
    if (!match.refereeToken) {
      Swal.fire('Token Kosong', 'Klik tombol "Sync" terlebih dahulu untuk meng-generate token wasit.', 'warning');
      return;
    }
    const magicUrl = `${window.location.origin}/tournament/match-input/${match.id}?token=${match.refereeToken}`;
    navigator.clipboard.writeText(magicUrl);
    Swal.fire({ icon: 'success', title: 'Magic Link Wasit Disalin!', text: magicUrl, timer: 2000, showConfirmButton: false });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Jadwal Admin...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Manajemen Schedule Pertandingan</h2>
          <p className="text-xs text-muted-foreground">Kelola waktu (WIB), Wasit, Streamer, dan otomatisasi channel Discord match.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* 🔄 TOMBOL REFRESH LIST STAF */}
          <button
            onClick={handleRefreshStaffList}
            disabled={isStaffRefreshing}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
          >
            🔄 {isStaffRefreshing ? 'Refreshing...' : 'Refresh Staf KV'}
          </button>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-card border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Semua Minggu ({schedules.length} Match)</option>
            {weekOptions.map((w) => (
              <option key={w.weekNum} value={w.weekNum}>{w.weekNum} ({w.matches.length} Match)</option>
            ))}
          </select>

          {selectedWeek !== 'ALL' && (
            <button
              onClick={handleBroadcastRecap}
              disabled={isRecapLoading}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
            >
              📊 {isRecapLoading ? 'Processing...' : `Broadcast Weekly Recap (${selectedWeek})`}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredSchedules.map((m) => {
          const isEditing = editingMatch?.id === m.id;
          const currentData = isEditing ? editingMatch : m;

          return (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-2 text-xs">
                <span className="font-extrabold text-primary uppercase">{m.groupName} • {m.id} • Week {m.calculatedWeekNumber}</span>
                <span className="text-muted-foreground font-semibold">
                  {new Date(m.matchDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                </span>
              </div>

              <div className="flex items-center justify-between my-2 font-black text-sm">
                <div className="flex items-center gap-2">
                  <img src={m.teamALogo} alt="" className="h-6 w-6 object-contain" />
                  <span>{m.teamAName}</span>
                </div>
                <span className="text-amber-500 font-extrabold text-xs">{m.scoreA} - {m.scoreB}</span>
                <div className="flex items-center gap-2">
                  <span>{m.teamBName}</span>
                  <img src={m.teamBLogo} alt="" className="h-6 w-6 object-contain" />
                </div>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-muted/20 rounded-xl text-xs">
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">TANGGAL & WAKTU (WIB)</label>
                    <input
                      type="datetime-local"
                      value={formatISOToWIBInput(currentData.matchDate)}
                      onChange={(e) => setEditingMatch({ ...currentData, matchDate: formatWIBInputToISO(e.target.value) })}
                      className="w-full rounded-lg bg-background border border-input p-2 font-semibold"
                    />
                  </div>

                  {/* 🟢 DROPDOWN REFEREE */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">WASIT / REFEREE</label>
                    <select
                      value={currentData.refereeDiscordId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedStaff = refereeList.find((r) => r.discordId === selectedId);
                        setEditingMatch({
                          ...currentData,
                          refereeDiscordId: selectedId,
                          referee: selectedStaff ? selectedStaff.discordName : '',
                        });
                      }}
                      className="w-full rounded-lg bg-background border border-input p-2 font-semibold text-xs cursor-pointer"
                    >
                      <option value="">-- Belum Ada Wasit --</option>
                      {refereeList.map((r) => (
                        <option key={r.discordId} value={r.discordId}>{r.discordName}</option>
                      ))}
                    </select>
                  </div>

                  {/* 🟢 DROPDOWN STREAMER */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">STREAMER / CASTER</label>
                    <select
                      value={currentData.streamerDiscordId || currentData.casterDiscordId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedStaff = streamerList.find((s) => s.discordId === selectedId);
                        setEditingMatch({
                          ...currentData,
                          streamerDiscordId: selectedId,
                          casterDiscordId: selectedId,
                          streamer: selectedStaff ? selectedStaff.discordName : '',
                          caster: selectedStaff ? selectedStaff.discordName : '',
                        });
                      }}
                      className="w-full rounded-lg bg-background border border-input p-2 font-semibold text-xs cursor-pointer"
                    >
                      <option value="">-- Belum Ada Streamer --</option>
                      {streamerList.map((s) => (
                        <option key={s.discordId} value={s.discordId}>{s.discordName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">YOUTUBE / STREAM LINK</label>
                    <input type="text" placeholder="https://youtube.com/..." value={currentData.streamLink || ''} onChange={(e) => setEditingMatch({ ...currentData, streamLink: e.target.value })} className="w-full rounded-lg bg-background border border-input p-2 font-medium" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingMatch(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted cursor-pointer">Batal</button>
                    <button onClick={() => handleSaveMatchSchedule(currentData)} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 cursor-pointer">💾 Simpan</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-border/40 gap-2">
                  <div className="space-x-3 text-muted-foreground">
                    <span><b>Wasit:</b> {m.referee || '-'}</span>
                    <span><b>Streamer:</b> {m.streamer || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingMatch(m)} className="px-3 py-1 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 text-[11px] font-bold hover:bg-sky-500/20 cursor-pointer">✏️ Edit</button>
                    <button onClick={() => handleCopyMagicLink(m)} className="px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 cursor-pointer">📋 Copy Link</button>
                    <button onClick={() => handleSyncSingleMatch(m)} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm cursor-pointer">🔄 Sync</button>
                    <button onClick={() => handleDeleteChannel(m)} className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm cursor-pointer">🗑️ Delete Channel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
    }
                        
