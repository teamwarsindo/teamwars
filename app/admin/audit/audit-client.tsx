'use client';

import { useState, useEffect, useMemo } from 'react';

export default function AuditClientContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: { totalMatches: number; mismatchedCount: number; totalKeysInKv: number };
    schedules: any[];
    keysMeta: { key: string; type: string }[];
  } | null>(null);

  // Selected Key & Custom Data View
  const [selectedKey, setSelectedKey] = useState<string>('twi:schedules');
  const [currentKvData, setCurrentKvData] = useState<any>(null);
  const [fetchingKeyData, setFetchingKeyData] = useState(false);

  // Search & Column Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [fieldToDelete, setFieldToDelete] = useState('');

  // Fetch Data Initial Audit
  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kv-audit');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setCurrentKvData(json.schedules);
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

  // Ambil Data Key Spesifik dari KV
  const handleSelectKey = async (keyName: string) => {
    setSelectedKey(keyName);
    if (keyName === 'twi:schedules') {
      setCurrentKvData(data?.schedules || []);
      return;
    }

    setFetchingKeyData(true);
    try {
      // Panggil API untuk ambil raw value key ini
      const res = await fetch(`/api/admin/kv-audit?key=${encodeURIComponent(keyName)}`);
      const json = await res.json();
      if (json.success) {
        setCurrentKvData(json.value);
      } else {
        // Fallback jika API tidak kirim value
        setCurrentKvData(json);
      }
    } catch {
      alert(`Gagal mengambil isi data key: ${keyName}`);
    } finally {
      setFetchingKeyData(false);
    }
  };

  // Normalisasi Data Menjadi Array Of Objects Agar Selalu Bisa Dibuat Tabel
  const tableDataArray = useMemo(() => {
    if (!currentKvData) return [];
    if (Array.isArray(currentKvData)) return currentKvData;
    if (typeof currentKvData === 'object') return [currentKvData];
    return [{ value: currentKvData }];
  }, [currentKvData]);

  // Ekstrak Seluruh Keys/Kolom Secara Dinamis dari Data
  const dynamicColumns = useMemo(() => {
    if (!tableDataArray.length) return [];
    const keysSet = new Set<string>();
    tableDataArray.forEach((item) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((k) => keysSet.add(k));
      }
    });
    return Array.from(keysSet);
  }, [tableDataArray]);

  // Initialize Default Column Visibility
  useEffect(() => {
    if (dynamicColumns.length > 0) {
      const initialVis: Record<string, boolean> = {};
      dynamicColumns.forEach((col) => {
        initialVis[col] = true;
      });
      setVisibleColumns(initialVis);
    }
  }, [dynamicColumns]);

  // Toggle Visibility Kolom
  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  // Auto Fix Normalisasi Nama Group
  const handleNormalizeGroups = async () => {
    if (!confirm('Ubah semua "Group A" / "Group B" menjadi "Anda Yakin?" / "Sakurasawa Fighters"?')) return;
    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'NORMALIZE_GROUPS' }),
      });
      const json = await res.json();
      alert(json.message || json.error);
      fetchAuditData();
    } catch {
      alert('Gagal menormalisasi group');
    }
  };

  // Hapus Kolom/Field Tertentu
  const handleDeleteField = async () => {
    if (!fieldToDelete) return alert('Masukkan nama field/kolom');
    if (!confirm(`Hapus kolom "${fieldToDelete}" dari seluruh item data?`)) return;

    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName: fieldToDelete }),
      });
      const json = await res.json();
      alert(json.message || json.error);
      setFieldToDelete('');
      fetchAuditData();
    } catch {
      alert('Gagal menghapus kolom');
    }
  };

  // Hapus Baris Match
  const handleDeleteRow = async (rowId: string) => {
    if (!confirm(`Hapus item ID: ${rowId}?`)) return;
    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: rowId }),
      });
      const json = await res.json();
      alert(json.message || json.error);
      fetchAuditData();
    } catch {
      alert('Gagal menghapus item');
    }
  };

  // Filter Data berdasarkan Search Term
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableDataArray;
    return tableDataArray.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tableDataArray, searchTerm]);

  // Helper Formatter Tampilan Sel Tabel
  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground/40 italic">-</span>;
    if (typeof val === 'boolean') {
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
          {val ? 'TRUE' : 'FALSE'}
        </span>
      );
    }
    if (typeof val === 'object') {
      return (
        <details className="cursor-pointer">
          <summary className="text-[10px] font-mono text-primary hover:underline">
            {Array.isArray(val) ? `Array[${val.length}]` : 'Object'}
          </summary>
          <pre className="mt-1 p-2 bg-background/80 rounded border border-border text-[9px] font-mono overflow-x-auto max-w-xs max-h-32">
            {JSON.stringify(val, null, 2)}
          </pre>
        </details>
      );
    }
    return String(val);
  };

  if (loading) return <div className="text-center py-12 text-xs font-bold text-primary animate-pulse">⏳ Memindai Upstash KV...</div>;

  return (
    <div className="space-y-6">
      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Matches In Schedule</p>
          <p className="text-2xl font-black text-foreground mt-1">{data?.summary.totalMatches || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10">
          <p className="text-xs text-destructive uppercase font-semibold">Group Mismatch ("Group A/B")</p>
          <p className="text-2xl font-black text-destructive mt-1">{data?.summary.mismatchedCount || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Keys di Upstash KV</p>
          <p className="text-2xl font-black text-primary mt-1">{data?.summary.totalKeysInKv || 0}</p>
        </div>
      </div>

      {/* KEY FILTER & TOOLBAR */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Dropdown Selector KV Key */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Pilih Data Key KV:</label>
            <select
              value={selectedKey}
              onChange={(e) => handleSelectKey(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="twi:schedules">twi:schedules (Main Schedule Array)</option>
              {(data?.keysMeta || [])
                .filter((k) => k.key !== 'twi:schedules')
                .map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.key} ({k.type})
                  </option>
                ))}
            </select>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {data?.summary.mismatchedCount ? (
              <button
                onClick={handleNormalizeGroups}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
              >
                ⚡ Auto-Fix Group Names ({data.summary.mismatchedCount})
              </button>
            ) : null}

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Hapus kolom (mis: scoreA)"
                value={fieldToDelete}
                onChange={(e) => setFieldToDelete(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              />
              <button
                onClick={handleDeleteField}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                ❌ Hapus Kolom
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN VISIBILITY TOGGLES */}
        {dynamicColumns.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-bold text-muted-foreground mb-2">Tampilkan/Sembunyikan Kolom ({dynamicColumns.length} Total Kolom Terdeteksi):</p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
              {dynamicColumns.map((col) => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
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

      {/* DYNAMIC UNIVERSAL TABLE */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="🔍 Cari di seluruh isi tabel data..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
        />

        {fetchingKeyData ? (
          <div className="text-center py-12 text-xs font-bold text-primary animate-pulse">⏳ Mengambil data key "{selectedKey}"...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border uppercase text-muted-foreground font-semibold">
                <tr>
                  {dynamicColumns
                    .filter((col) => visibleColumns[col])
                    .map((col) => (
                      <th key={col} className="p-3 whitespace-nowrap font-mono">
                        {col}
                      </th>
                    ))}
                  <th className="p-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={dynamicColumns.length + 1} className="p-6 text-center text-muted-foreground">
                      Tidak ada data ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-muted/30">
                      {dynamicColumns
                        .filter((col) => visibleColumns[col])
                        .map((col) => (
                          <td key={col} className="p-3 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                            {renderCellValue(row[col])}
                          </td>
                        ))}
                      <td className="p-3 text-right whitespace-nowrap">
                        {row.id ? (
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-[11px] font-bold"
                          >
                            🗑️ Delete
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No ID</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}