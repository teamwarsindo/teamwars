"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

export function MatchReportTable({
  match,
  gameLogs,
  isAdminMode,
  editingRowIndex,
  isSaving,
  setEditingRowIndex,
  onAddLogRow,
  onUpdateLogField,
  onToggleWinner,
  onRemoveLogRow,
  onSaveRow,
}: {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  isAdminMode: boolean;
  editingRowIndex: number | null;
  isSaving: boolean;
  setEditingRowIndex: (idx: number | null) => void;
  onAddLogRow: () => void;
  onUpdateLogField: (index: number, field: keyof GameDetailLog, value: any) => void;
  onToggleWinner: (index: number, winnerTeamId: string) => void;
  onRemoveLogRow: (index: number) => void;
  onSaveRow: () => void;
}) {
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  const playerNamesA = rosterA.map((p) => p.playerName);
  const playerNamesB = rosterB.map((p) => p.playerName);

  return (
    <div className="rounded-xl border border-sky-400/30 bg-[#002b5e] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#00224a] border-b border-sky-400/30">
        <span className="text-[11px] font-extrabold text-sky-300 uppercase tracking-wider">
          GAME LOGS ({gameLogs.length})
        </span>
        {isAdminMode && (
          <button
            onClick={onAddLogRow}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-white font-black text-[11px] transition cursor-pointer shadow-sm"
          >
            + Tambah Log
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-[#003875] text-[10px] font-bold text-sky-200 border-b border-sky-400/30 uppercase">
              <th className="py-2 px-1 w-10">Aksi</th>
              <th className="py-2 px-2">Player A</th>
              <th className="py-2 px-2">Skill A</th>
              <th className="py-2 px-2">Deck A</th>
              <th className="py-2 px-2 text-emerald-400">Hasil</th>
              <th className="py-2 px-2">Deck B</th>
              <th className="py-2 px-2">Skill B</th>
              <th className="py-2 px-2">Player B</th>
              <th className="py-2 px-1 w-10">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-500/20">
            {gameLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-xs font-medium text-sky-200/60 italic">
                  Belum ada log pertandingan. {isAdminMode ? "Klik '+ Tambah Log' untuk mulai menginput." : ""}
                </td>
              </tr>
            ) : (
              gameLogs.map((log, idx) => {
                const isEditingThisRow = editingRowIndex === idx;
                const isAWin = log.winnerTeamId === match.teamAId;

                return (
                  <tr key={idx} className="hover:bg-[#003875]/50 transition text-[11px]">
                    <td className="py-1.5 px-1">
                      {isAdminMode && (
                        isEditingThisRow ? (
                          <button
                            onClick={onSaveRow}
                            disabled={isSaving}
                            className="p-1 rounded bg-emerald-500 text-white font-bold cursor-pointer hover:bg-emerald-400"
                            title="Simpan"
                          >
                            💾
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingRowIndex(idx)}
                            className="p-1 rounded text-sky-300 hover:text-white font-bold cursor-pointer"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        )
                      )}
                    </td>

                    <td className="py-1.5 px-2">
                      {isEditingThisRow ? (
                        <select
                          value={log.teamAPlayerName}
                          onChange={(e) => {
                            onUpdateLogField(idx, "teamAPlayerName", e.target.value);
                            onUpdateLogField(idx, "teamAPlayerId", e.target.value);
                          }}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-1 text-white text-[11px]"
                        >
                          {playerNamesA.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-white font-semibold">{log.teamAPlayerName}</span>
                      )}
                    </td>

                    <td className="py-1.5 px-2">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamASkill}
                          onChange={(e) => onUpdateLogField(idx, "teamASkill", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-1 text-white text-[11px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100">{log.teamASkill}</span>
                      )}
                    </td>

                    <td className="py-1.5 px-2">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamADeck}
                          onChange={(e) => onUpdateLogField(idx, "teamADeck", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-1 text-white text-[11px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100">{log.teamADeck}</span>
                      )}
                    </td>

                    <td className="py-1.5 px-2 font-black text-xs whitespace-nowrap">
                      {isEditingThisRow ? (
                        <div className="flex items-center justify-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAWin}
                              onChange={() => onToggleWinner(idx, match.teamAId)}
                              className="accent-emerald-400 h-3.5 w-3.5"
                            />
                            <span className={isAWin ? "text-emerald-400" : "text-rose-400"}>W</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isAWin}
                              onChange={() => onToggleWinner(idx, match.teamBId)}
                              className="accent-rose-500 h-3.5 w-3.5"
                            />
                            <span className={!isAWin ? "text-emerald-400" : "text-rose-400"}>L</span>
                          </label>
                        </div>
                      ) : (
                        <span>
                          <span className={isAWin ? "text-emerald-400" : "text-rose-400"}>{isAWin ? "W" : "L"}</span>
                          <span className="mx-1 text-sky-400/50">-</span>
                          <span className={!isAWin ? "text-emerald-400" : "text-rose-400"}>{!isAWin ? "W" : "L"}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-1.5 px-2">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamBDeck}
                          onChange={(e) => onUpdateLogField(idx, "teamBDeck", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-1 text-white text-[11px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100">{log.teamBDeck}</span>
                      )}
                    </td>

                    <td className="py-1.5 px-2">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamBSkill}
                          onChange={(e) => onUpdateLogField(idx, "teamBSkill", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-1 text-white text-[11px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100">{log.teamBSkill}</span>
                      )}
                    </td>

                    <td className="py-1.5 px-2">
                      {isEditingThisRow ? (
                        <select
                          value={log.teamBPlayerName}
                          onChange={(e) => {
                            onUpdateLogField(idx, "teamBPlayerName", e.target.value);
                            onUpdateLogField(idx, "teamBPlayerId", e.target.value);
                          }}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-1 text-white text-[11px]"
                        >
                          {playerNamesB.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-white font-semibold">{log.teamBPlayerName}</span>
                      )}
                    </td>

                    <td className="py-1.5 px-1">
                      {isAdminMode && (
                        <button
                          onClick={() => onRemoveLogRow(idx)}
                          className="text-rose-400 hover:text-rose-200 font-bold px-1 cursor-pointer"
                          title="Hapus"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
    }
                        
