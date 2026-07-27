'use client';

import { useState } from 'react';
import { Team } from '../hooks/use-admin-teams';
import { Eye, Users, Edit, ShieldAlert, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { FeedbackModal, FeedbackState } from './feedback-modal';
import Swal from 'sweetalert2';

interface AdminTableProps {
  teams: Team[];
  isLoading: boolean;
  onPreviewProof: (url: string) => void;
  onSelectRoster: (team: Team) => void;
  onRefreshData: () => void;
}

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
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug: team.id }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Sinkronisasi Berhasil',
          message: `Data tim "${team.namaTim}" telah berhasil disinkronkan ke Database Global dan Discord.`,
        });
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Sinkronisasi Gagal',
          message: data.error || 'Gagal memperbarui data tim di Discord.',
        });
      }
    } catch (err) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Gagal menghubungkan ke server sinkronisasi.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    // MENGGUNAKAN SWEETALERT2 UNTUK PROMPT MODERN
    const { value: confirmText, isDismissed } = await Swal.fire({
      title: 'PENGHAPUSAN PERMANEN',
      html: `Ketik <b>HAPUS</b> untuk mendiskualifikasi dan menghapus tim <span class="text-rose-500 font-bold">${team.namaTim}</span>`,
      input: 'text',
      icon: 'warning',
      background: '#171717', 
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#3f3f46', 
      confirmButtonText: 'Eksekusi Hapus',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) return 'Kamu harus mengetik kata konfirmasi!';
        if (value !== 'HAPUS') return 'Kata kunci tidak sesuai!';
      },
    });

    if (isDismissed || confirmText !== 'HAPUS') return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug: team.id }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Tim Berhasil Dihapus',
          message: data.message || `Tim "${team.namaTim}" telah didiskualifikasi dan seluruh data/role/channel terkait telah dibersihkan.`,
        });
        onRefreshData();
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Penghapusan Gagal',
          message: data.error || 'Gagal menghapus tim dari database.',
        });
      }
    } catch (err) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Gagal terhubung ke server saat menghapus tim.',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={() => onPreviewProof(team.buktiTransfer)}
          className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition shrink-0"
          title="Lihat Bukti Transfer"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectRoster(team)}
          className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500 hover:text-white transition shrink-0"
          title="Detail Roster"
        >
          <Users className="w-4 h-4" />
        </button>

        <a
          href={team.editUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition shrink-0"
          title="Edit Team (Token User)"
        >
          <Edit className="w-4 h-4" />
        </a>

        <a
          href={team.adminEditUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition shrink-0"
          title="Edit Team (Admin Key Bypass)"
        >
          <ShieldAlert className="w-4 h-4" />
        </a>

        <button
          onClick={handleSync}
          disabled={isSyncing || isDeleting}
          className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500 hover:text-white transition disabled:opacity-50 shrink-0"
          title="Force Sync Discord & Global DB"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>

        <button
          onClick={handleDelete}
          disabled={isSyncing || isDeleting}
          className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition disabled:opacity-50 shrink-0"
          title="Diskualifikasi & Hapus Tim"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      <FeedbackModal data={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}

export function AdminTable({
  teams,
  isLoading,
  onPreviewProof,
  onSelectRoster,
  onRefreshData,
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
    <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl w-full">
      <table className="w-full min-w-[1100px] text-left text-sm whitespace-nowrap">
        <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 w-12 text-center">No</th>
            <th className="px-4 py-3 w-16 text-center">Logo</th>
            <th className="px-4 py-3 min-w-[180px]">Nama Tim</th>
            <th className="px-4 py-3 min-w-[200px]">Email</th>
            <th className="px-4 py-3 min-w-[180px]">Waktu Regis</th>
            <th className="px-4 py-3 w-28">Warna</th>
            <th className="px-4 py-3 w-32 text-center">Total Roster</th>
            <th className="px-4 py-3 min-w-[240px] text-center">Aksi</th>
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
                  <td className="px-4 py-3 text-center text-neutral-400 font-medium">
                    {team.no}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
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
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-white whitespace-normal break-words max-w-[200px]">
                    {team.namaTim}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {team.email}
                  </td>
                  <td className="px-4 py-3 text-neutral-300 font-mono text-xs">
                    {formatDateWIB(team.waktuRegis)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-neutral-700 shadow-sm shrink-0"
                        style={{ backgroundColor: team.warna }}
                      />
                      <span className="text-xs uppercase text-neutral-400 font-mono">
                        {team.warna}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
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
                  <td className="px-4 py-3 text-center">
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
