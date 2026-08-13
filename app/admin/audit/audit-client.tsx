'use client';

import { useState, useEffect } from 'react';
import { AuditSummary } from './components/audit-summary';
import { AuditToolbar } from './components/audit-toolbar';
import { AuditTable } from './components/audit-table';

export default function AuditClientContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState('twi:schedules');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [isRawJsonMode, setIsRawJsonMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [orderedColumns, setOrderedColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldToDelete, setFieldToDelete] = useState('');

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kv-audit');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setupKeyData('twi:schedules', json.schedules);
      }
    } catch {
      alert('Gagal mengambil data audit KV');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const setupKeyData = (keyName: string, val: any) => {
    setSelectedKey(keyName);
    if (Array.isArray(val)) {
      setIsRawJsonMode(false);
      setTableRows(val);
      extractColumns(val);
    } else if (typeof val === 'object' && val !== null) {
      setIsRawJsonMode(false);
      setTableRows([val]);
      extractColumns([val]);
    } else {
      setIsRawJsonMode(true);
      setRawJsonText(typeof val === 'string' ? val : JSON.stringify(val, null, 2));
    }
  };

  const extractColumns = (rows: any[]) => {
    const keysSet = new Set<string>();
    rows.forEach((r) => r && typeof r === 'object' && Object.keys(r).forEach((k) => keysSet.add(k)));
    const cols = Array.from(keysSet);
    setOrderedColumns(cols);
    const vis: Record<string, boolean> = {};
    cols.forEach((c) => (vis[c] = true));
    setVisibleColumns(vis);
  };

  const handleSelectKey = async (keyName: string) => {
    if (keyName === 'twi:schedules') return setupKeyData('twi:schedules', data?.schedules || []);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kv-audit?key=${encodeURIComponent(keyName)}`);
      const json = await res.json();
      setupKeyData(keyName, json.value);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveColumn = (colName: string, direction: 'LEFT' | 'RIGHT') => {
    const idx = orderedColumns.indexOf(colName);
    const targetIdx = direction === 'LEFT' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderedColumns.length) return;
    const newCols = [...orderedColumns];
    [newCols[idx], newCols[targetIdx]] = [newCols[targetIdx], newCols[idx]];
    setOrderedColumns(newCols);
  };

  const handleSaveCell = async (rowIndex: number, colName: string, newValue: string) => {
    let parsedVal: any = newValue;
    if (newValue.toLowerCase() === 'true') parsedVal = true;
    else if (newValue.toLowerCase() === 'false') parsedVal = false;
    else if (!isNaN(Number(newValue)) && newValue.trim() !== '') parsedVal = Number(newValue);
    else if (newValue.startsWith('{') || newValue.startsWith('[')) {
      try { parsedVal = JSON.parse(newValue); } catch {}
    }

    const updatedRows = [...tableRows];
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [colName]: parsedVal };
    setTableRows(updatedRows);
    await saveToKv(updatedRows);
  };

  const saveToKv = async (rowsData: any[]) => {
    setIsSaving(true);
    try {
      await fetch('/api/admin/kv-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedKey === 'twi:schedules' ? 'SAVE_SCHEDULES' : 'SET_RAW_KEY',
          rawKey: selectedKey,
          rawValue: rowsData,
          updatedSchedules: rowsData,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNormalizeGroups = async () => {
    if (!confirm('Ubah semua "Group A/B" menjadi "Anda Yakin? / Sakurasawa Fighters"?')) return;
    await fetch('/api/admin/kv-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'NORMALIZE_GROUPS' }),
    });
    fetchAuditData();
  };

  const handleDeleteField = async () => {
    if (!fieldToDelete) return;
    const cleaned = tableRows.map((r) => {
      const copy = { ...r };
      delete copy[fieldToDelete];
      return copy;
    });
    setTableRows(cleaned);
    extractColumns(cleaned);
    setFieldToDelete('');
    await saveToKv(cleaned);
  };

  const handleDeleteRow = async (index: number) => {
    if (!confirm(`Hapus baris ke-${index + 1}?`)) return;
    const filtered = tableRows.filter((_, idx) => idx !== index);
    setTableRows(filtered);
    await saveToKv(filtered);
  };

  if (loading) return <div className="text-center py-12 text-xs font-bold text-primary animate-pulse">⏳ Memuat Audit...</div>;

  return (
    <div className="space-y-6">
      <AuditSummary summary={data?.summary} />
      <AuditToolbar
        selectedKey={selectedKey}
        keysMeta={data?.keysMeta || []}
        isSaving={isSaving}
        isRawJsonMode={isRawJsonMode}
        mismatchedCount={data?.summary?.mismatchedCount}
        orderedColumns={orderedColumns}
        visibleColumns={visibleColumns}
        fieldToDelete={fieldToDelete}
        setFieldToDelete={setFieldToDelete}
        onSelectKey={handleSelectKey}
        onNormalizeGroups={handleNormalizeGroups}
        onDeleteField={handleDeleteField}
        onToggleColumn={(col) => setVisibleColumns((p) => ({ ...p, [col]: !p[col] }))}
      />
      {isRawJsonMode ? (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <textarea
            rows={15}
            value={rawJsonText}
            onChange={(e) => setRawJsonText(e.target.value)}
            className="w-full p-4 font-mono text-xs rounded-xl border border-border bg-background"
          />
        </div>
      ) : (
        <AuditTable
          tableRows={tableRows}
          orderedColumns={orderedColumns}
          visibleColumns={visibleColumns}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onMoveColumn={handleMoveColumn}
          onSaveCell={handleSaveCell}
          onDeleteRow={handleDeleteRow}
        />
      )}
    </div>
  );
}