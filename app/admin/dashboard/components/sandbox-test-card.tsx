'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { MatchScheduleItem } from '@/lib/types/tournament';

export function SandboxTestCard() {
  // State khusus Sandbox Match Dummy
  const [testMatch, setTestMatch] = useState<MatchScheduleItem>({
    id: 'match-test',
    stage: 'Group Stage',
    groupName: 'Group A',
    teamAId: 'team-test-a',
    teamAName: 'Testing Team Alpha',
    teamBId: 'team-test-b',
    teamBName: 'Testing Team Beta',
    teamALogo: '/logo-placeholder.png',
    teamBLogo: '/logo-placeholder.png',
    scoreA: 0,
    scoreB: 0,
    matchDate: new Date().toISOString(),
    referee: 'Wasit Tester',
    refereeDiscordId: '123456789',
    streamer: 'Streamer Tester',
    caster: '987654321',
    streamLink: 'https://youtube.com',
    refereeToken: '',
    isFinished: false,
  });
  const [isEditing, setIsEditing] = useState(false);

  // 1. GENERATE CHANNEL TEST (DENGAN TAG ROLE)
  const handleGenerateTestChannel = async () => {
    Swal.fire({
      title: 'Generating Channel Test...',
      text: 'Membuat channel ⚔️-match-test + Tag Role Admin...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // Auto-generate Token jika belum ada
      const newToken = testMatch.refereeToken || `test-tok-${Math.random().toString(36).substring(2, 8)}`;
      setTestMatch((prev) => ({ ...prev, refereeToken: newToken }));

      const res = await fetch('/api/tournament/generate-channel?testing=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: 'match-test',
          weekName: 'Week Test',
          testing: true,
          isSync: false, // FALSE = DENGAN TAG ROLE
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Berhasil Generate!', `Channel ⚔️-match-test dibuat! Token Generated: ${newToken}`, 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal generate channel', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
  };

  // 2. SYNC MATCH TEST (TANPA TAG ROLE)
  const handleSyncTestMatch = async () => {
    Swal.fire({
      title: 'Syncing Match Test...',
      text: 'Memperbarui Embed di ⚔️-match-test TANPA Tag Role...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch('/api/tournament/generate-channel?testing=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: 'match-test',
          weekName: 'Week Test',
          testing: true,
          isSync: true, // TRUE = TANPA TAG ROLE
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Berhasil Sync!', 'Embed diperbarui tanpa tag role!', 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal sync channel', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
  };

  // 3. COPY LINK WASIT
  const handleCopyMagicLink = () => {
    if (!testMatch.refereeToken) {
      Swal.fire({
        icon: 'warning',
        title: 'Token Belum Ada!',
        text: 'Klik "Generate (Test)" atau "Sync" terlebih dahulu untuk membuat Token Wasit.',
      });
      return;
    }

    const magicUrl = `${window.location.origin}/tournament/match-input/${testMatch.id}?token=${testMatch.refereeToken}`;
    navigator.clipboard.writeText(magicUrl);
    Swal.fire({
      icon: 'success',
      title: 'Magic Link Wasit Disalin!',
      text: magicUrl,
      timer: 2500,
      showConfirmButton: false,
    });
  };

  // 4. HAPUS CHANNEL DISCORD
  const handleDeleteTestChannel = async () => {
    const confirm = await Swal.fire({
      title: 'Hapus Channel ⚔️-match-test?',
      text: 'Channel sandbox di Discord akan dihapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({ title: 'Deleting Test Channel...', didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/tournament/delete-test-channel', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Berhasil!', data.message, 'success');
      } else {
        Swal.fire('Gagal', data.error || 'Gagal menghapus', 'error');
      }
    } catch {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-500/60 bg-amber-950/10 p-4 shadow-sm space-y-3 mb-6">
      <div className="flex flex-wrap items-center justify-between border-b border-amber-500/30 pb-2 text-xs">
        <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>🧪</span> SANDBOX MATCH TESTER (SIMULASI SERUPA MATCH RESMI)
        </span>
        <span className="text-amber-300/70 font-semibold">
          Token Status: {testMatch.refereeToken ? <code className="text-emerald-400 font-bold">{testMatch.refereeToken}</code> : <span className="text-rose-400 font-bold">NO-TOKEN</span>}
        </span>
      </div>

      <div className="flex items-center justify-between my-2 font-black text-sm text-foreground">
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold">{testMatch.teamAName}</span>
        </div>
        <span className="text-amber-500 font-extrabold text-xs">{testMatch.scoreA} - {testMatch.scoreB}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold">{testMatch.teamBName}</span>
        </div>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-amber-950/30 rounded-xl text-xs border border-amber-500/30">
          <div>
            <label className="block text-[10px] text-amber-300 font-bold mb-1">WASIT & ID DISCORD</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={testMatch.referee}
                onChange={(e) => setTestMatch({ ...testMatch, referee: e.target.value })}
                className="w-1/2 bg-background border border-amber-500/40 rounded p-1 text-xs"
              />
              <input
                type="text"
                value={testMatch.refereeDiscordId || ''}
                onChange={(e) => setTestMatch({ ...testMatch, refereeDiscordId: e.target.value })}
                className="w-1/2 bg-background border border-amber-500/40 rounded p-1 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-amber-300 font-bold mb-1">STREAMER & ID DISCORD</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={testMatch.streamer}
                onChange={(e) => setTestMatch({ ...testMatch, streamer: e.target.value })}
                className="w-1/2 bg-background border border-amber-500/40 rounded p-1 text-xs"
              />
              <input
                type="text"
                value={testMatch.caster || ''}
                onChange={(e) => setTestMatch({ ...testMatch, caster: e.target.value })}
                className="w-1/2 bg-background border border-amber-500/40 rounded p-1 text-xs"
              />
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 rounded bg-amber-600 text-white font-bold text-xs">
              💾 Simpan Sandbox
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-amber-500/20 gap-2">
          <div className="space-x-3 text-muted-foreground text-[11px]">
            <span><b>Wasit:</b> {testMatch.referee}</span>
            <span><b>Streamer:</b> {testMatch.streamer}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 text-[11px] font-bold hover:bg-sky-500/20 cursor-pointer"
            >
              ✏️ Edit
            </button>

            <button
              onClick={handleCopyMagicLink}
              className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 cursor-pointer"
            >
              📋 Copy Link
            </button>

            <button
              onClick={handleSyncTestMatch}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
            >
              🔄 Sync
            </button>

            <button
              onClick={handleGenerateTestChannel}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
            >
              🚀 Generate (Test)
            </button>

            <button
              onClick={handleDeleteTestChannel}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
            >
              🗑️ Clear Channel
            </button>
          </div>
        </div>
      )}
    </div>
  );
    }
    
