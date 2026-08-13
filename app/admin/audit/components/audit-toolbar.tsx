'use client';

interface AuditToolbarProps {
  selectedKey: string;
  keysMeta: { key: string; type: string }[];
  isSaving: boolean;
  isRawJsonMode: boolean;
  mismatchedCount?: number;
  orderedColumns: string[];
  visibleColumns: Record<string, boolean>;
  fieldToDelete: string;
  setFieldToDelete: (val: string) => void;
  onSelectKey: (key: string) => void;
  onNormalizeGroups: () => void;
  onDeleteField: () => void;
  onToggleColumn: (col: string) => void;
}

export function AuditToolbar({
  selectedKey,
  keysMeta,
  isSaving,
  isRawJsonMode,
  mismatchedCount,
  orderedColumns,
  visibleColumns,
  fieldToDelete,
  setFieldToDelete,
  onSelectKey,
  onNormalizeGroups,
  onDeleteField,
  onToggleColumn,
}: AuditToolbarProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-muted-foreground uppercase">Data Key KV:</label>
          <select
            value={selectedKey}
            onChange={(e) => onSelectKey(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
          >
            <option value="twi:schedules">twi:schedules (Main Schedule Array)</option>
            {keysMeta
              .filter((k) => k.key !== 'twi:schedules')
              .map((k) => (
                <option key={k.key} value={k.key}>
                  {k.key} ({k.type})
                </option>
              ))}
          </select>
          {isSaving && <span className="text-[11px] font-bold text-amber-500 animate-pulse">💾 Menyimpan ke KV...</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mismatchedCount ? (
            <button
              onClick={onNormalizeGroups}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
            >
              ⚡ Fix Mismatch ({mismatchedCount})
            </button>
          ) : null}

          {!isRawJsonMode && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Hapus kolom (mis: scoreA)"
                value={fieldToDelete}
                onChange={(e) => setFieldToDelete(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              />
              <button
                onClick={onDeleteField}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                ❌ Hapus Kolom
              </button>
            </div>
          )}
        </div>
      </div>

      {!isRawJsonMode && orderedColumns.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[11px] font-bold text-muted-foreground mb-2">Visibilitas Kolom ({orderedColumns.length} Total Kolom):</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
            {orderedColumns.map((col) => (
              <button
                key={col}
                onClick={() => onToggleColumn(col)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                  visibleColumns[col]
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-muted/50 text-muted-foreground border border-transparent opacity-50'
                }`}
              >
                {visibleColumns[col] ? '✓ ' : '+ '}
                {col}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}