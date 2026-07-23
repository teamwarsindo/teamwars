'use client';

import { Team } from '../hooks/use-admin-teams';
import { Eye, Users, Edit, ShieldAlert } from 'lucide-react';

interface AdminTableProps {
  teams: Team[];
  isLoading: boolean;
  onPreviewProof: (url: string) => void;
  onSelectRoster: (team: Team) => void;
}

export function AdminTable({
  teams,
  isLoading,
  onPreviewProof,
  onSelectRoster,
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
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onPreviewProof(team.buktiTransfer)}
                        className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white transition"
                        title="Lihat Bukti Transfer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectRoster(team)}
                        className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-600 hover:text-white transition"
                        title="Detail Roster"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <a
                        href={team.editUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-600 hover:text-white transition"
                        title="Edit Team (Token User)"
                      >
                        <Edit className="w-4 h-4" />
                      </a>
                      <a
                        href={team.adminEditUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition"
                        title="Edit Team (Admin Key Bypass)"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </a>
                    </div>
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
