'use client';

import { useState, useEffect, useMemo } from 'react';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { MatchAdminCard } from './match-admin-card';
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
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');

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

  const weekOptions = useMemo(() => {
    if (!schedules?.length) return [];
    const weeksMap = new Map<number, MatchScheduleItem[]>();
    schedules.forEach((m) => {
      const wNum = m.weekNumber || 1;
      if (!weeksMap.has(wNum)) weeksMap.set(wNum, []);
      weeksMap.get(wNum)?.push(m);
    });
    return Array.from(weeksMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNumber, matches]) => ({ weekNum: `Week ${weekNumber}`, weekNumber, matches }));
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    if (selectedWeek === 'ALL') return schedules;
    const weekNum = parseInt(selectedWeek.replace('Week ', ''), 10);
    return schedules.filter((m) => (m.weekNumber || 1) === weekNum);
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
    const res = await Swal.fire({
      title: `Kelola Broadcast ${selectedWeek}?`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Ya, Broadcast!',
      denyButtonText: '🗑️ Hapus Broadcast',
      confirmButtonColor: '#9333ea',
      denyButtonColor: '#e11d48',
    });

    const method = res.isConfirmed ? 'POST' : res.isDenied ? 'DELETE' : null;
    if (!method) return;

    Swal.fire({ title: 'Processing...', didOpen: () => Swal.showLoading() });
    const apiRes = await fetch('/api/tournament/weekly-recap', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWeek: selectedWeek }),
    });
    if (apiRes.ok) {
      await fetchSchedulesAndStaff();
      Swal.fire('Selesai!', `Operasi ${selectedWeek} berhasil!`, 'success');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Jadwal Admin...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Manajemen Schedule Pertandingan</h2>
          <p className="text-xs text-muted-foreground">Kelola waktu (WIB), Wasit, Streamer, dan otomatisasi channel Discord match.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={async () => {
              Swal.fire({ title: 'Refreshing...', didOpen: () => Swal.showLoading() });
              await fetch('/api/tournament/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REFRESH_STAFF_ASSIGNMENTS' }) });
              await fetchSchedulesAndStaff();
              Swal.fire({ icon: 'success', title: 'Staf Di-refresh!', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
            }}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
          >
            🔄 Refresh Staf KV
          </button>

          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="bg-card border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground cursor-pointer">
            <option value="ALL">Semua Minggu ({schedules.length} Match)</option>
            {weekOptions.map((w) => <option key={w.weekNum} value={w.weekNum}>{w.weekNum} ({w.matches.length} Match)</option>)}
          </select>

          {selectedWeek !== 'ALL' && (
            <button onClick={handleBroadcastRecap} className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer">
              📊 Broadcast Recap ({selectedWeek})
            </button>
          )}
        </div>
      </div>

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