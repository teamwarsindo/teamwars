'use client';

import { useState, useEffect, useMemo } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { SandboxTestCard } from './sandbox-test-card';
import Swal from 'sweetalert2';

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
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<MatchScheduleItem | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/tournament');
      const data = await res.json();
      if (data && data.schedules) setSchedules(data.schedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSchedules(); }, []);

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
        await fetchSchedules();
        setEditingMatch(null);
        Swal.fire({ icon: 'success', title: 'Jadwal Berhasil Disimpan!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      }
    } catch {
      Swal.fire('Error', 'Gagal menyimpan perubahan jadwal', 'error');
    }
  };

  const handleSyncSingleMatch = async (match: MatchScheduleItem & { calculatedWeekNumber?: number }) => {
    Swal.fire({ title: 'Syncing Match...', text: `Memperbarui data & role untuk ${match.teamAName} vs ${match.teamBName}`, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch('/api/tournament/generate-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, weekName: `Week ${match.calculatedWeekNumber || 1}` }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Berhasil!', 'Match berhasil di-sync ke Discord!', 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal melakukan sync match', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  const handleGenerateAllWeekChannels = async () => {
    const targetMatchIds = filteredSchedules.map((m) => m.id);
    if (targetMatchIds.length === 0) {
      Swal.fire('Info', 'Tidak ada match untuk di-generate', 'info');
      return;
    }
    const confirm = await Swal.fire({
      title: `Generate ALL Channel (${selectedWeek === 'ALL' ? 'Semua Match' : selectedWeek})?`,
      text: `Sistem akan membuat ${targetMatchIds.length} channel Discord otomatis untuk minggu ini.`,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Generate!', cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;

    Swal.fire({ title: 'Batch Generating Channels...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch('/api/tournament/generate-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: targetMatchIds, weekName: selectedWeek === 'ALL' ? 'Week 1' : selectedWeek }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Selesai!', `Berhasil membuat ${data.totalProcessed} channel Discord!`, 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal generate channel batch', 'error');
      }
    } catch {
      Swal.fire('Error', 'Terjadi kesalahan server saat batch generate', 'error');
    }
  };

  const handleCopyMagicLink = (match: MatchScheduleItem) => {
    const magicUrl = `${window.location.origin}/tournament/match-input/${match.id}?token=${match.refereeToken || ''}`;
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
          <button
            onClick={handleGenerateAllWeekChannels}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🚀 Generate All Channels ({selectedWeek})</span>
          </button>
        </div>
      </div>

      {/* 🧪 KARTU SANDBOX TESTING */}
      <SandboxTestCard />

      {/* LIST KARTU MATCH RESMI */}
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
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">WASIT (NAMA & DISCORD ID)</label>
                    <div className="flex gap-1">
                      <input type="text" placeholder="Nama" value={currentData.referee || ''} onChange={(e) => setEditingMatch({ ...currentData, referee: e.target.value })} className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium" />
                      <input type="text" placeholder="ID" value={currentData.refereeDiscordId || ''} onChange={(e) => setEditingMatch({ ...currentData, refereeDiscordId: e.target.value })} className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-1">STREAMER (NAMA & DISCORD ID)</label>
                    <div className="flex gap-1">
                      <input type="text" placeholder="Nama" value={currentData.streamer || ''} onChange={(e) => setEditingMatch({ ...currentData, streamer: e.target.value })} className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium" />
                      <input type="text" placeholder="ID" value={currentData.caster || ''} onChange={(e) => setEditingMatch({ ...currentData, caster: e.target.value })} className="w-1/2 rounded-lg bg-background border border-input p-2 font-medium" />
                    </div>
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
