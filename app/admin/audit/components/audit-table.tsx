'use client';

import { useState } from 'react';

interface AuditTableProps {
  tableRows: any[];
  orderedColumns: string[];
  visibleColumns: Record<string, boolean>;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onMoveColumn: (col: string, dir: 'LEFT' | 'RIGHT') => void;
  onSaveCell: (rowIndex: number, colName: string, newValue: string) => void;
  onDeleteRow: (index: number) => void;
}

export function AuditTable({
  tableRows,
  orderedColumns,
  visibleColumns,
  searchTerm,
  setSearchTerm,
  onMoveColumn,
  onSaveCell,
  onDeleteRow,
}: AuditTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [cellEditValue, setCellEditValue] = useState('');

  const filteredRows = tableRows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase()));

  const startEdit = (rowIndex: number, colName: string, currentValue: any) => {
    setEditingCell({ rowIndex, colName });
    setCellEditValue(typeof currentValue === 'object' && currentValue !== null ? JSON.stringify(currentValue) : String(currentValue ?? ''));
  };

  const submitEdit = (rowIndex: number, colName: string) => {
    onSaveCell(rowIndex, colName, cellEditValue);
    setEditingCell(null);
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="🔍 Cari data di baris / kolom apapun..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-inner max-h-[600px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/80 border-b border-border sticky top-0 z-10 backdrop-blur-md uppercase text-muted-foreground font-semibold">
            <tr>
              <th className="p-3 border-r border-border w-12 text-center">#</th>
              {orderedColumns
                .filter((col) => visibleColumns[col])
                .map((col) => (
                  <th key={col} className="p-3 border-r border-border whitespace-nowrap font-mono min-w-[140px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>{col}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onMoveColumn(col, 'LEFT')} className="px-1 hover:bg-background/80 rounded text-[10px]">◀</button>
                        <button onClick={() => onMoveColumn(col, 'RIGHT')} className="px-1 hover:bg-background/80 rounded text-[10px]">▶</button>
                      </div>
                    </div>
                  </th>
                ))}
              <th className="p-3 text-right whitespace-nowrap sticky right-0 bg-muted/90 backdrop-blur-md">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map(({ row, originalIndex }) => (
              <tr key={originalIndex} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 border-r border-border text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                  {originalIndex + 1}
                </td>
                {orderedColumns
                  .filter((col) => visibleColumns[col])
                  .map((col) => {
                    const isEditing = editingCell?.rowIndex === originalIndex && editingCell?.colName === col;
                    const cellVal = row[col];

                    return (
                      <td
                        key={col}
                        onClick={() => !isEditing && startEdit(originalIndex, col, cellVal)}
                        className="p-2 border-r border-border max-w-xs overflow-hidden text-ellipsis cursor-pointer hover:bg-primary/5"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={cellEditValue}
                              onChange={(e) => setCellEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') submitEdit(originalIndex, col);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-1 text-xs rounded border border-primary bg-background text-foreground"
                            />
                            <button onClick={() => submitEdit(originalIndex, col)} className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground font-bold">✓</button>
                          </div>
                        ) : (
                          <div className="truncate">
                            {cellVal === undefined || cellVal === null ? (
                              <span className="text-muted-foreground/30 italic">-</span>
                            ) : typeof cellVal === 'boolean' ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cellVal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {cellVal ? 'TRUE' : 'FALSE'}
                              </span>
                            ) : typeof cellVal === 'object' ? (
                              <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {Array.isArray(cellVal) ? `Array[${cellVal.length}]` : 'Object'}
                              </span>
                            ) : (
                              String(cellVal)
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                <td className="p-2 text-right whitespace-nowrap sticky right-0 bg-card border-l border-border">
                  <button onClick={() => onDeleteRow(originalIndex)} className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px] font-bold">
                    🗑️ Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}