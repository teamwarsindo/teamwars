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
        // 1. Dimentokin ke lebar layar (95vw) & tinggi dikunci di 88vh
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-[95vw] max-w-[1400px] h-[88vh] flex flex-col p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal - Fixed height */}
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

        {/* 2. Container Tabel: Kunci Scroll (overflow-hidden) & memenuhi sisa ruang (flex-1) */}
        <div className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col justify-start">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3 w-[110px]">Role</th>
                <th className="px-5 py-3 w-[220px]">Nama Lengkap</th>
                <th className="px-5 py-3 w-[200px]">Discord Username</th>
                <th className="px-5 py-3 w-[200px]">IGN (In-Game Name)</th>
                <th className="px-5 py-3 w-[180px]">ID Duel Links</th>
                <th className="px-5 py-3 w-[160px] text-center">Status Discord</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {team.players.map((p: any, i) => {
                const isKetua = p.role?.toLowerCase() === 'ketua';
                const isWakil = p.role?.toLowerCase() === 'wakil';

                return (
                  <tr key={i} className="hover:bg-neutral-900/40 transition h-[44px]">
                    <td className="px-5 py-2 truncate">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md border inline-block ${
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
                    <td className="px-5 py-2 font-medium text-white truncate">
                      {p.namaLengkap || p.nama || <span className="text-neutral-600 italic">Data kosong</span>}
                    </td>
                    <td className="px-5 py-2 font-mono text-pink-400 truncate">@{p.discord}</td>
                    <td className="px-5 py-2 text-neutral-300 truncate">{p.ign}</td>
                    <td className="px-5 py-2 text-neutral-400 font-mono text-xs truncate">{p.idDuelLinks}</td>
                    <td className="px-5 py-2 text-center">
                      {p.hasRoleDiscord ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold">
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
