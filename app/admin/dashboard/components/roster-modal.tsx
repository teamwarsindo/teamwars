'use client';

import { Team } from '../hooks/use-admin-teams';
import { Users, X, CheckCircle2, XCircle } from 'lucide-react';

interface RosterModalProps {
  team: Team | null;
  onClose: () => void;
}

export function RosterModal({ team, onClose }: RosterModalProps) {
  if (!team) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        // PERBAIKAN 1: Ganti max-w-4xl jadi max-w-6xl biar lebih lebar dan lega di laptop
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-6xl w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Detail Roster: <span className="text-blue-400">{team.namaTim}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pemeriksaan status verifikasi Discord pemain
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

        {/* PERBAIKAN 2: Ubah overflow-y-auto jadi overflow-auto biar kalau layar kekecilan bisa scroll kanan-kiri */}
        <div className="overflow-auto max-h-[60vh] rounded-xl border border-neutral-800 bg-neutral-950">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-4">Role</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Discord Username</th>
                <th className="p-4">IGN (In-Game Name)</th>
                <th className="p-4">ID Duel Links</th>
                <th className="p-4 text-center">Status Discord</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {team.players.map((p: any, i) => {
                const isKetua = p.role?.toLowerCase() === 'ketua';
                const isWakil = p.role?.toLowerCase() === 'wakil';

                return (
                  <tr key={i} className="hover:bg-neutral-900/40 transition">
                    <td className="p-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                          isKetua
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : isWakil
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    {/* PERBAIKAN 3: Fallback ke p.namaLengkap jika p.nama tidak ada */}
                    <td className="p-4 font-medium text-white">
                      {p.namaLengkap || <span className="text-neutral-600 italic">Data kosong</span>}
                    </td>
                    <td className="p-4 font-mono text-pink-400">@{p.discord}</td>
                    <td className="p-4 text-neutral-300">{p.ign}</td>
                    <td className="p-4 text-neutral-400 font-mono text-xs">{p.idDuelLinks}</td>
                    <td className="p-4 text-center">
                      {p.hasRoleDiscord ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Missing
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
