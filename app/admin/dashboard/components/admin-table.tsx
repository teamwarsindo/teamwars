'use client';

import { useState } from 'react';
import { Team } from '../hooks/use-admin-teams';
import { Eye, Users, Edit, ShieldAlert, RefreshCw, Trash2, Loader2 } from 'lucide-react';

interface AdminTableProps {
  teams: Team[];
  isLoading: boolean;
  onPreviewProof: (url: string) => void;
  onSelectRoster: (team: Team) => void;
  onRefreshData: () => void; // TAMBAHAN BARU: Untuk ngereload table pasca hapus tim
}

// Komponen Action khusus per baris (biar loading statenya nggak bikin satu tabel rerender)
function TeamRowActions({
  team,
  onRefreshData,
  onPreviewProof,
  onSelectRoster,
}: {
  team: Team;
  onRefreshData: () => void;
  onPreviewProof: (url: string) => void;
  onSelectRoster: (team: Team) => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug: team.slug }), // Asumsi ada field slug
      });
      const data = await res.json();
      if (data.success) alert(`Sukses: ${data.message}`);
      else alert(`Gagal: ${data.error}`);
    } catch (err) {
      alert('Network error saat sinkronisasi');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    const confirmPrompt = window.prompt(
      `PENGHAPUSAN PERMANEN\nKetik "HAPUS" untuk mendiskualifikasi dan menghapus tim ${team.namaTim} (Role & Channel Discord juga akan dihapus):`
    );

    if (confirmPrompt !== 'HAPUS') {
      if (confirmPrompt !== null) alert('Pembatalan: Kata kunci tidak sesuai.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug: team.slug }), // Asumsi ada field slug
      });
      const data = await res.json();

      if (data.success) {
        alert('Tim berhasil dihapus!');
        onRefreshData(); // Panggil fungsi refresh di parent
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } catch (err) {
      alert('Network error saat menghapus tim');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* 1. Lihat Bukti */}
      <button
        onClick={() => onPreviewProof(team.buktiTransfer)}
        className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition"
        title="Lihat Bukti Transfer"
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* 2. Modal Roster */}
      <button
        onClick={() => onSelectRoster(team)}
        className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500 hover:text-white transition"
        title="Detail Roster"
      >
        <Users className="w-4 h-4" />
      </button>

      {/* 3. Link Edit Tim Biasa */}
      <a
        href={team.editUrl}
        target="_blank"
        rel="noreferrer"
        className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition"
        title="Edit Team (Token User)"
      >
        <Edit className="w-4 h-4" />
      </a>

      {/* 4. Link Edit Admin Bypass */}
      <a
        href={team.adminEditUrl}
        target="_blank"
        rel="noreferrer"
        className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition"
        title="Edit Team (Admin Key Bypass)"
      >
        <ShieldAlert className="w-4 h-4" />
      </a>

      {/* 5. TOMBOL BARU: Force Sync Discord */}
      <button
        onClick={handleSync}
        disabled={isSyncing || isDeleting}
        className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500 hover:text-white transition disabled:opacity-50"
        title="Force Sync Discord (Roster & Tracker)"
      >
        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      </button>

      {/* 6. TOMBOL BARU: Hapus Tim */}
      <button
        onClick={handleDelete}
        disabled={isSyncing || isDeleting}
        className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition disabled:opacity-50"
        title="Diskualifikasi & Hapus Tim"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function AdminTable({
  teams,
  isLoading,
  onPreviewProof,
  onSelectRoster,
  onRefreshData, // TAMBAHAN BARU
}: AdminTableProps) {
  const formatDateWIB = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return (
      date
        .toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        .replace(/\./g, ':') + ' WIB'
    );
  };

  return (
    <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="p-4">No</th>
            <th className="p-4">Logo</th>
            <th className="p-4">Nama Tim</th>
            <th className="p-4">Email</th>
            <th className="p-4">Waktu Regis</th>
            <th className="p-4">Warna</th>
            <th className="p-4 text-center">Total Roster</th>
            <th className="p-4 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="p-12 text-center text-neutral-500">
                Memuat data pendaftaran dari server...
              </td>
            </tr>
          ) : teams.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-12 text-center text-neutral-500">
                Tidak ada data tim yang sesuai dengan pencarian
              </td>
            </tr>
          ) : (
            teams.map((team) => {
              const [verified, total] = team.rosterStatus.split('/');
              const isComplete = verified === total;

              return (
                <tr
                  key={team.id}
                  className="hover:bg-neutral-800/40 transition duration-150"
                >
                  <td className="p-4 text-neutral-400 font-medium">{team.no}</td>
                  <td className="p-4">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt="Logo"
                        className="w-10 h-10 object-cover rounded-xl bg-neutral-950 border border-neutral-800"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-[10px] text-neutral-500">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-bold text-white">{team.namaTim}</td>
                  <td className="p-4 text-neutral-400">{team.email}</td>
                  <td className="p-4 text-neutral-300 font-mono text-xs">
                    {formatDateWIB(team.waktuRegis)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-neutral-700 shadow-sm"
                        style={{ backgroundColor: team.warna }}
                      />
                      <span className="text-xs uppercase text-neutral-400 font-mono">
                        {team.warna}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isComplete
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}
                    >
                      {team.rosterStatus}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {/* Menggunakan komponen aksi yang baru dibuat */}
                    <TeamRowActions
                      team={team}
                      onPreviewProof={onPreviewProof}
                      onSelectRoster={onSelectRoster}
                      onRefreshData={onRefreshData}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
