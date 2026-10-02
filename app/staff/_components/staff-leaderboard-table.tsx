'use client';

import React, { useState } from 'react';
import { Link2, Check, Loader2 } from 'lucide-react';
import { ComputedStaffItem } from '../_library/staff-metrics';
import StaffAvatar from './staff-avatar';

interface StaffLeaderboardTableProps {
  statsList: ComputedStaffItem[];
  role: 'referee' | 'streamer';
  baselineGpm: number;
  isAdmin?: boolean;
}

export default function StaffLeaderboardTable({
  statsList,
  role,
  baselineGpm,
  isAdmin = false,
}: StaffLeaderboardTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (discordId: string) => {
    setLoadingId(discordId);
    try {
      const res = await fetch('/api/tournament/staff/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Gagal');

      await navigator.clipboard.writeText(data.url);
      setCopiedId(discordId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Gagal menyalin link token.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
      <table className="w-full border-collapse text-left table-fixed">
        <thead className="bg-muted/65 border-b border-border text-[10px] uppercase tracking-wider text-foreground/75 font-bold">
          <tr>
            <th className="py-2.5 pl-4 pr-1 text-center w-14 sm:w-16">RANK</th>
            <th className="py-2.5 pl-2 sm:pl-3 pr-2 text-left">{role === 'referee' ? 'REFEREE' : 'STREAMER'}</th>
            <th className="py-2.5 px-0.5 text-center w-14 sm:w-16">MATCH</th>
            <th className="py-2.5 px-0.5 text-center w-16 sm:w-20">PERFORM</th>
            <th className="py-2.5 pr-4 pl-0.5 text-center w-14 sm:w-16">GPM</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 text-[11px]">
          {statsList.slice(1).map((st, idx) => (
            <tr key={st.discordId} className="hover:bg-muted/40 transition-colors">
              <td className="py-2.5 pl-4 pr-1 text-center font-bold font-mono text-xs">
                <div className="flex items-center justify-center gap-1">
                  {st.rankChange.direction === 'UP' && <span className="text-[9px] text-emerald-500 font-bold leading-none">▲</span>}
                  {st.rankChange.direction === 'DOWN' && <span className="text-[9px] text-rose-500 font-bold leading-none">▼</span>}
                  {st.rankChange.direction === 'SAME' && <span className="text-[9px] text-muted-foreground/60 font-bold leading-none">-</span>}
                  <span>{idx + 2}</span>
                </div>
              </td>
              <td className="py-2.5 pl-2 sm:pl-3 pr-2 font-bold truncate">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <StaffAvatar name={st.discordName} avatarUrl={st.avatar} size="sm" />
                    <span className="truncate">{st.discordName}</span>
                  </div>
                  {isAdmin && role === 'referee' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(st.discordId)}
                      disabled={loadingId === st.discordId}
                      title="Generate & Salin Link Wasit"
                      className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0 transition cursor-pointer"
                    >
                      {loadingId === st.discordId ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      ) : copiedId === st.discordId ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </td>
              <td className="py-2.5 px-0.5 text-center font-semibold">{st.matchCount}</td>
              <td className={`py-2.5 px-0.5 text-center font-bold ${st.performNum >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {st.performNum}%
              </td>
              <td className={`py-2.5 pr-4 pl-0.5 text-center font-bold ${st.gpmNum >= baselineGpm ? 'text-emerald-500' : 'text-rose-500'}`}>
                {st.gpmNum.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}