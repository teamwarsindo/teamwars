'use client';

import React from 'react';
import Swal from 'sweetalert2';

export function SandboxTestCard() {
  const handleSyncTestMatch = async () => {
    Swal.fire({
      title: 'Syncing Test Match...',
      text: 'Memperbarui Embed di channel ⚔️-match-test...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch('/api/tournament/generate-channel?testing=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: 'match-test', weekName: 'Week Test', testing: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Berhasil Sync!', 'Embed di channel ⚔️-match-test berhasil diperbarui!', 'success');
      } else {
        Swal.fire('Gagal Sync', data.error || 'Gagal sync channel test', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
  };

  const handleTestRescheduleWebUpdate = async () => {
    const { value: newDate } = await Swal.fire({
      title: '🧪 Test Reschedule Web Update',
      text: 'Pilih tanggal baru untuk mensimulasikan update jadwal otomatis di Web:',
      input: 'datetime-local',
      showCancelButton: true,
      confirmButtonText: 'Simulasikan Update Jadwal',
    });

    if (!newDate) return;

    Swal.fire({ title: 'Updating Schedule...', didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 3,
          data: { custom_id: `btn_confirm_reschedule_match-test_${new Date(newDate).toISOString()}` },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reschedule Test Berhasil!',
          html: `<p class="text-xs">${data.data?.content || 'Jadwal diperbarui secara otomatis!'}</p>`,
        });
      }
    } catch {
      Swal.fire('Error', 'Gagal uji coba reschedule', 'error');
    }
  };

  const handleDeleteTestChannel = async () => {
    const confirm = await Swal.fire({
      title: 'Hapus Channel ⚔️-match-test?',
      text: 'Channel testing di Discord akan dihapus bersih.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Sekarang!',
      cancelButtonText: 'Batal',
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({ title: 'Deleting Test Channel...', didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/tournament/delete-test-channel', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Berhasil!', data.message, 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal menghapus channel test', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-950/10 p-4 shadow-sm space-y-3 mb-6">
      <div className="flex flex-wrap items-center justify-between border-b border-amber-500/30 pb-2 text-xs">
        <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>🧪</span> SANDBOX TESTING MATCH (CHANNEL: ⚔️-match-test)
        </span>
        <span className="text-amber-300/70 font-semibold">
          Uji Coba Match Report, Sync & Reschedule Tanpa Merusak Data Resmi
        </span>
      </div>

      <div className="flex items-center justify-between my-2 font-black text-sm text-foreground">
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold">Testing Team Alpha</span>
        </div>
        <span className="text-amber-500 font-extrabold text-xs">VS</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold">Testing Team Beta</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-amber-500/20 gap-2">
        <div className="space-x-3 text-muted-foreground text-[11px]">
          <span><b>Wasit:</b> Wasit Tester</span>
          <span><b>Streamer:</b> Streamer Tester</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncTestMatch}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black shadow-md cursor-pointer flex items-center gap-1"
          >
            <span>🔄 Sync Match (Test Sandbox)</span>
          </button>

          <button
            onClick={handleTestRescheduleWebUpdate}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black shadow-md cursor-pointer flex items-center gap-1"
          >
            <span>📅 Test Reschedule Auto-Update Web</span>
          </button>

          <button
            onClick={handleDeleteTestChannel}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black shadow-md cursor-pointer flex items-center gap-1"
          >
            <span>🗑️ Hapus Channel Test Discord</span>
          </button>
        </div>
      </div>
    </div>
  );
      }
      
