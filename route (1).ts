'use client';

import { Team } from '../hooks/use-admin-teams';
import { Users, X, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface RosterModalProps {
  team: Team | null;
  onClose: () => void;
}

export function RosterModal({ team, onClose }: RosterModalProps) {
  if (!team) return null;

  // Pastikan selalu ada 10 slot pemain agar tinggi tabel tetap konstan/stabil untuk SS
  const TOTAL_SLOTS = 10;
  const players = team.players || [];
  const filledPlayers = [...players];

  // Tambahkan slot kosong jika pemain kurang dari 10
  while (filledPlayers.length < TOTAL_SLOTS) {
    filledPlayers.push(null as any);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container - Lebar Proporsional (max-w-5xl) */}
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl p-6 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Detail Roster: <span className="text-blue-400">{team.namaTim}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pemeriksaan status verifikasi Discord pemain (10 Slot Roster)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabel Roster - Kunci Tinggi 10 Slot */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 w-[22%]">Nama Lengkap</th>
                <th className="px-4 py-3 w-[20%]">Discord Username</th>
                <th className="px-4 py-3 w-[18%]">IGN (In-Game Name)</th>
                <th className="px-4 py-3 w-[16%]">ID Duel Links</th>
                <th className="px-4 py-3 w-[11%] text-center">Jabatan</th>
                <th className="px-4 py-3 w-[13%] text-center">Status Discord</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filledPlayers.map((p: any, i) => {
                // Render baris dummy jika slot kosong (agar modal tidak mengkerut)
                if (!p) {
                  return (
                    <tr key={`empty-${i}`} className="h-[44px] bg-neutral-950/40 text-neutral-600">
                      <td className="px-4 py-2 italic text-xs">Slot {i + 1} (Kosong)</td>
                      <td className="px-4 py-2 text-xs">—</td>
                      <td className="px-4 py-2 text-xs">—</td>
                      <td className="px-4 py-2 text-xs">—</td>
                      <td className="px-4 py-2 text-center text-xs">—</td>
                      <td className="px-4 py-2 text-center text-xs">—</td>
                    </tr>
                  );
                }

                const isKetua = p.role?.toLowerCase() === 'ketua';
                const isWakil = p.role?.toLowerCase() === 'wakil';

                const rawDate = p.claimedAt || p.verifiedAt;
                const claimedDate = rawDate
                  ? new Date(rawDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null;

                return (
                  <tr key={i} className="hover:bg-neutral-900/40 transition h-[44px]">
                    {/* 1. Nama Lengkap */}
                    <td className="px-4 py-2 font-medium text-white truncate">
                      {p.namaLengkap || p.nama || <span className="text-neutral-600 italic">Data kosong</span>}
                    </td>

                    {/* 2. Discord Username */}
                    <td className="px-4 py-2 font-mono text-pink-400 truncate">
                      @{p.discord}
                    </td>

                    {/* 3. IGN (In-Game Name) */}
                    <td className="px-4 py-2 text-neutral-300 truncate">
                      {p.ign}
                    </td>

                    {/* 4. ID Duel Links */}
                    <td className="px-4 py-2 text-neutral-400 font-mono text-xs truncate">
                      {p.idDuelLinks}
                    </td>

                    {/* 5. Jabatan / Role (Dipisah ke kolom sendiri) */}
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                          isKetua
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : isWakil
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        {p.role || 'Anggota'}
                      </span>
                    </td>

                    {/* 6. Status Discord + Waktu Klaim */}
                    <td className="px-4 py-2 text-center">
                      {p.hasRoleDiscord ? (
                        <div className="inline-flex flex-col items-center">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </div>
                          {claimedDate && (
                            <span className="text-[9px] text-neutral-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {claimedDate}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" /> Missing
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
