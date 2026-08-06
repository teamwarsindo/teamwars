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
    <div className="rounded-xl border border-sky-400/40 bg-[#003875] overflow-hidden">
      {/* Control Bar Khusus Admin Mode */}
      {isAdminMode && (
        <div className="flex items-center justify-between px-2 py-1 bg-[#002855] border-b border-sky-400/30">
          <span className="text-[9px] font-extrabold text-sky-300 uppercase">Input Log Console</span>
          <button
            onClick={onAddLogRow}
            className="rounded bg-emerald-600 hover:bg-emerald-500 px-1.5 py-0.5 text-white font-bold text-[9px] transition cursor-pointer"
          >
            + Add Log
          </button>
        </div>
      )}

      {/* 🟢 ULTRA COMPACT TABLE: MUAT 100% DI HP TANPA NEED TO SCROLL */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-center border-collapse text-[8px] sm:text-xs table-fixed">
          <thead>
            <tr className="bg-[#00224a] text-[8px] sm:text-[11px] font-bold text-white border-b border-sky-400/40 uppercase">
              {isAdminMode && <th className="py-1 px-0.5 w-[5%]"></th>}
              <th className="py-1 px-0.5 w-[15%] truncate">Player</th>
              <th className="py-1 px-0.5 w-[18%] truncate">Archetype</th>
              <th className="py-1 px-0.5 w-[15%] truncate">Skill</th>
              <th className="py-1 px-0.5 w-[14%] text-[#00ffcc] truncate">Gauntlet</th>
              <th className="py-1 px-0.5 w-[15%] truncate">Skill</th>
              <th className="py-1 px-0.5 w-[18%] truncate">Archetype</th>
              <th className="py-1 px-0.5 w-[15%] truncate">Player</th>
              {isAdminMode && <th className="py-1 px-0.5 w-[5%]"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#004d9e]">
            {gameLogs.length === 0 ? (
              <tr>
                <td colSpan={isAdminMode ? 9 : 7} className="py-6 text-center text-[9px] sm:text-xs font-semibold text-sky-200/60 italic">
                  Belum ada log pertandingan.
                </td>
              </tr>
            ) : (
              gameLogs.map((log, idx) => {
                const isEditingThisRow = editingRowIndex === idx;
                const isAWin = log.winnerTeamId === match.teamAId;

                return (
                  <tr key={idx} className="hover:bg-[#00448e] transition font-medium">
                    {/* EDIT (ADMIN ONLY) */}
                    {isAdminMode && (
                      <td className="py-1 px-0.5">
                        {isEditingThisRow ? (
                          <button onClick={onSaveRow} disabled={isSaving} className="text-[9px] font-bold text-emerald-400">💾</button>
                        ) : (
                          <button onClick={() => setEditingRowIndex(idx)} className="text-[9px] font-bold text-sky-300">✏️</button>
                        )}
                      </td>
                    )}

                    {/* PLAYER A */}
                    <td className="py-1 px-0.5 truncate">
                      {isEditingThisRow ? (
                        <select
                          value={log.teamAPlayerName}
                          onChange={(e) => {
                            onUpdateLogField(idx, "teamAPlayerName", e.target.value);
                            onUpdateLogField(idx, "teamAPlayerId", e.target.value);
                          }}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-0 text-white text-[8px]"
                        >
                          {playerNamesA.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-white font-bold truncate block">{log.teamAPlayerName}</span>
                      )}
                    </td>

                    {/* ARCHETYPE A */}
                    <td className="py-1 px-0.5 truncate">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamADeck}
                          onChange={(e) => onUpdateLogField(idx, "teamADeck", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-0 text-white text-[8px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100 truncate block">{log.teamADeck}</span>
                      )}
                    </td>

                    {/* SKILL A */}
                    <td className="py-1 px-0.5 truncate">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamASkill}
                          onChange={(e) => onUpdateLogField(idx, "teamASkill", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-0 text-white text-[8px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100 truncate block">{log.teamASkill}</span>
                      )}
                    </td>

                    {/* GAUNTLET (W / L) */}
                    <td className="py-1 px-0.5 font-extrabold text-[9px] sm:text-xs whitespace-nowrap">
                      {isEditingThisRow ? (
                        <div className="flex items-center justify-center gap-1">
                          <label className="flex items-center gap-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAWin}
                              onChange={() => onToggleWinner(idx, match.teamAId)}
                              className="accent-emerald-400 h-2.5 w-2.5"
                            />
                            <span className={isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>W</span>
                          </label>
                          <label className="flex items-center gap-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isAWin}
                              onChange={() => onToggleWinner(idx, match.teamBId)}
                              className="accent-rose-500 h-2.5 w-2.5"
                            />
                            <span className={!isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>L</span>
                          </label>
                        </div>
                      ) : (
                        <span>
                          <span className={isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>
                            {isAWin ? "W" : "L"}
                          </span>
                          <span className="mx-0.5 text-sky-300 font-normal">-</span>
                          <span className={!isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>
                            {!isAWin ? "W" : "L"}
                          </span>
                        </span>
                      )}
                    </td>

                    {/* SKILL B */}
                    <td className="py-1 px-0.5 truncate">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamBSkill}
                          onChange={(e) => onUpdateLogField(idx, "teamBSkill", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-0 text-white text-[8px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100 truncate block">{log.teamBSkill}</span>
                      )}
                    </td>

                    {/* ARCHETYPE B */}
                    <td className="py-1 px-0.5 truncate">
                      {isEditingThisRow ? (
                        <input
                          type="text"
                          value={log.teamBDeck}
                          onChange={(e) => onUpdateLogField(idx, "teamBDeck", e.target.value)}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-0 text-white text-[8px] text-center"
                        />
                      ) : (
                        <span className="text-sky-100 truncate block">{log.teamBDeck}</span>
                      )}
                    </td>

                    {/* PLAYER B */}
                    <td className="py-1 px-0.5 truncate">
                      {isEditingThisRow ? (
                        <select
                          value={log.teamBPlayerName}
                          onChange={(e) => {
                            onUpdateLogField(idx, "teamBPlayerName", e.target.value);
                            onUpdateLogField(idx, "teamBPlayerId", e.target.value);
                          }}
                          className="w-full rounded bg-[#001d3d] border border-sky-400 p-0 text-white text-[8px]"
                        >
                          {playerNamesB.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-white font-bold truncate block">{log.teamBPlayerName}</span>
                      )}
                    </td>

                    {/* HAPUS (ADMIN ONLY) */}
                    {isAdminMode && (
                      <td className="py-1 px-0.5">
                        <button onClick={() => onRemoveLogRow(idx)} className="text-rose-400 font-bold text-[9px]">✕</button>
                      </td>
                    )}
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
