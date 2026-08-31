import React from 'react';
import { PlayerLineup } from '../_types';
import DiscordTrackerPreview from './discord-tracker-preview';

interface LineupTabProps {
  teamAName: string;
  teamBName: string;
  lineupA: PlayerLineup[];
  setLineupA: React.Dispatch<React.SetStateAction<PlayerLineup[]>>;
  lineupB: PlayerLineup[];
  setLineupB: React.Dispatch<React.SetStateAction<PlayerLineup[]>>;
  loading: boolean;
  onAction: (action: 'save' | 'publish') => void;
}

export default function LineupTab({
  teamAName,
  teamBName,
  lineupA,
  setLineupA,
  lineupB,
  setLineupB,
  loading,
  onAction,
}: LineupTabProps) {
  const renderLineupInputs = (
    title: string,
    colorClass: string,
    borderFocusClass: string,
    list: PlayerLineup[],
    setter: React.Dispatch<React.SetStateAction<PlayerLineup[]>>
  ) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h4 className={`font-bold ${colorClass} border-b border-slate-800 pb-2 text-sm`}>{title}</h4>
      {list.map((p, idx) => (
        <div key={idx} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Pemain {idx + 1}</span>
            <span>Life: {p.remainingLife ?? 2}/2</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="IGN Pemain"
              value={p.ign}
              onChange={(e) => {
                const updated = [...list];
                updated[idx].ign = e.target.value;
                setter(updated);
              }}
              className={`bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none ${borderFocusClass}`}
            />
            <input
              type="text"
              placeholder="ID Duel Links"
              value={p.idDuelLinks}
              onChange={(e) => {
                const updated = [...list];
                updated[idx].idDuelLinks = e.target.value;
                setter(updated);
              }}
              className={`bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none ${borderFocusClass}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Deck 1 Archetype"
              value={p.deck1?.archetype || ''}
              onChange={(e) => {
                const updated = [...list];
                updated[idx].deck1.archetype = e.target.value;
                setter(updated);
              }}
              className={`bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none ${borderFocusClass}`}
            />
            <input
              type="text"
              placeholder="Deck 2 Archetype"
              value={p.deck2?.archetype || ''}
              onChange={(e) => {
                const updated = [...list];
                updated[idx].deck2.archetype = e.target.value;
                setter(updated);
              }}
              className={`bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs outline-none ${borderFocusClass}`}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="font-bold text-white text-sm">Lineup Editor (/submit)</h3>
          <p className="text-slate-400 text-xs">Simpan draft KV atau publish langsung ke Tracker Camp Discord.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onAction('save')}
            disabled={loading}
            className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition"
          >
            💾 Simpan (Draft)
          </button>
          <button
            onClick={() => onAction('publish')}
            disabled={loading}
            className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition shadow-lg shadow-blue-900/40"
          >
            🚀 Publish ke Discord
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderLineupInputs(`Lineup ${teamAName}`, 'text-blue-400', 'focus:border-blue-500', lineupA, setLineupA)}
        {renderLineupInputs(`Lineup ${teamBName}`, 'text-red-400', 'focus:border-red-500', lineupB, setLineupB)}
      </div>

      <DiscordTrackerPreview teamAName={teamAName} teamBName={teamBName} lineupA={lineupA} lineupB={lineupB} />
    </div>
  );
    }
        
