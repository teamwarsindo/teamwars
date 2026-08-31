import React from 'react';
import { PlayerLineup } from '../_types';

interface DiscordTrackerPreviewProps {
  teamAName: string;
  teamBName: string;
  lineupA: PlayerLineup[];
  lineupB: PlayerLineup[];
}

export default function DiscordTrackerPreview({
  teamAName,
  teamBName,
  lineupA,
  lineupB,
}: DiscordTrackerPreviewProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <h4 className="font-bold text-white text-xs tracking-wide uppercase">
          Discord Live Preview — Tracker Camp
        </h4>
      </div>
      <div className="bg-[#2b2d31] p-4 rounded-lg border-l-4 border-[#5865f2] font-mono text-xs text-slate-200 space-y-2">
        <p className="font-bold text-white">📊 LIVE LINEUP TRACKER</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <p className="text-blue-400 font-bold border-b border-slate-700 pb-1">Camp {teamAName}</p>
            {lineupA.map((p, i) => (
              <p key={i} className="mt-1">
                • {p.ign || `Pemain ${i + 1}`}: {p.deck1?.archetype || '-'} / {p.deck2?.archetype || '-'} [{p.remainingLife ?? 2}/2]
              </p>
            ))}
          </div>
          <div>
            <p className="text-red-400 font-bold border-b border-slate-700 pb-1">Camp {teamBName}</p>
            {lineupB.map((p, i) => (
              <p key={i} className="mt-1">
                • {p.ign || `Pemain ${i + 1}`}: {p.deck1?.archetype || '-'} / {p.deck2?.archetype || '-'} [{p.remainingLife ?? 2}/2]
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
                }
