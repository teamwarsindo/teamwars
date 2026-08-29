'use client';

import { useState, useEffect, useMemo } from 'react';
import { TopBar, Footer } from "@/components/layout-shared";

interface KVItem {
  key: string;
  type: string;
  value: any;
}

export default function AdminAuditPage() {
  const [items, setItems] = useState<KVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form Tambah Key Baru
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'array' | 'object' | 'string'>('array');

  const fetchKVData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kv-audit');
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setItems(json.items);
        if (!activeKey && json.items.length > 0) {
          // Default pilih twi:schedules jika ada, atau item pertama
          const defaultKey = json.items.find((i: KVItem) => i.key === 'twi:schedules')?.key || json.items[0].key;
          setActiveKey(defaultKey);
        }
      }
    } catch {
      alert('Gagal mengambil data KV');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKVData();
  }, []);

  const currentItem = useMemo(() => items.find((i) => i.key === activeKey), [items, activeKey]);

  // Simpan perubahan data ke Vercel KV
  const persistKeyData = async (key: string, type: string, updatedValue: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, type, value: updatedValue }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.key === key ? { ...item, value: updatedValue } : item))
        );
      } else {
        alert('Gagal menyimpan perubahan ke server');
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntireKey = async (key: string) => {
    if (!confirm(`Hapus seluruh key "${key}" dari database?`)) return;
    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        const remaining = items.filter((i) => i.key !== key);
        setItems(remaining);
        if (activeKey === key) {
          setActiveKey(remaining[0]?.key || '');
        }
      }
    } catch {
      alert('Gagal menghapus key');
    }
  };

  const handleCreateNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    let initialVal: any = '';
    if (newKeyType === 'array') initialVal = [{}];
    else if (newKeyType === 'object') initialVal = { field1: 'value1' };

    await persistKeyData(newKeyName.trim(), 'string', initialVal);
    setActiveKey(newKeyName.trim());
    setNewKeyName('');
    setShowAddKeyModal(false);
  };

  const filteredKeyList = useMemo(() => {
    return items.filter((item) => item.key.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar title="Spreadsheet & JSON KV Manager" />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Key:</span>
            <span className="font-mono text-sm font-bold px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
              {activeKey || 'Pilih Key'}
            </span>
            {isSaving && <span className="text-xs font-bold text-amber-500 animate-pulse">💾 Menyimpan...</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddKeyModal(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              ＋ Tambah Key Baru
            </button>
            <button
              onClick={fetchKVData}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-border bg-background hover:bg-muted"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Layout 2 Kolom: Sidebar Daftar Key & Area Tabel Excel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar List Keys */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-3 space-y-3">
            <input
              type="text"
              placeholder="🔍 Cari Key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
            />

            <div className="max-h-[680px] overflow-y-auto space-y-1 pr-1">
              {loading ? (
                <p className="p-4 text-center text-xs text-muted-foreground animate-pulse">Memuat list...</p>
              ) : filteredKeyList.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Tidak ditemukan</p>
              ) : (
                filteredKeyList.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveKey(item.key)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between group ${
                      activeKey === item.key
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate flex-1 pr-2">{item.key}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-sans uppercase font-bold ${
                        activeKey === item.key ? 'bg-black/20 text-white' : 'bg-muted-foreground/10 text-muted-foreground'
                      }`}
                    >
                      {Array.isArray(item.value) ? `Array[${item.value.length}]` : typeof item.value === 'object' ? 'Obj' : 'Str'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Excel-like Editor Area */}
          <div className="lg:col-span-9 rounded-xl border border-border bg-card p-4 space-y-4">
            {currentItem ? (
              <InteractiveDataTable
                kvItem={currentItem}
                onSave={(val) => persistKeyData(currentItem.key, currentItem.type, val)}
                onDeleteKey={() => handleDeleteEntireKey(currentItem.key)}
              />
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground">Pilih key di sebelah kiri untuk melihat data tabel.</div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Tambah Key Baru */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateNewKey} className="bg-card border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase text-primary">Tambah Key KV Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nama Key</label>
                <input
                  type="text"
                  placeholder="mis: twi:tournament_rules"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Format Nilai Awal</label>
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-background"
                >
                  <option value="array">Tabel Berulang (Array of Objects)</option>
                  <option value="object">Tabel Single Map (Key-Value Object)</option>
                  <option value="string">String Tunggal</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddKeyModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-border hover:bg-muted"
              >
                Batal
              </button>
              <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                Buat Key
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}

// 🟢 KOMPONEN TABEL EXCEL INTERAKTIF (Bisa Edit Sel, Tambah Baris, Tambah Kolom)
function InteractiveDataTable({
  kvItem,
  onSave,
  onDeleteKey,
}: {
  kvItem: KVItem;
  onSave: (updatedVal: any) => void;
  onDeleteKey: () => void;
}) {
  const isArray = Array.isArray(kvItem.value);
  const isObject = typeof kvItem.value === 'object' && kvItem.value !== null && !isArray;

  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newColName, setNewColName] = useState('');

  // Sinkronisasi data saat kvItem berganti
  useEffect(() => {
    if (isArray) {
      setRows(kvItem.value);
      const cols = new Set<string>();
      kvItem.value.forEach((r: any) => {
        if (typeof r === 'object' && r !== null) Object.keys(r).forEach((k) => cols.add(k));
      });
      setColumns(Array.from(cols));
    } else if (isObject) {
      // Ubah Object { a: 1, b: 2 } jadi bentuk baris [{ key: 'a', value: 1 }, { key: 'b', value: 2 }]
      const mapped = Object.entries(kvItem.value).map(([k, v]) => ({ key: k, value: v }));
      setRows(mapped);
      setColumns(['key', 'value']);
    }
  }, [kvItem, isArray, isObject]);

  // Simpan nilai sel yang diedit
  const handleSaveCell = (rowIdx: number, colKey: string) => {
    let parsed: any = editVal;
    if (editVal.toLowerCase() === 'true') parsed = true;
    else if (editVal.toLowerCase() === 'false') parsed = false;
    else if (!isNaN(Number(editVal)) && editVal.trim() !== '') parsed = Number(editVal);
    else if (editVal.startsWith('{') || editVal.startsWith('[')) {
      try { parsed = JSON.parse(editVal); } catch {}
    }

    if (isArray) {
      const updated = [...rows];
      updated[rowIdx] = { ...updated[rowIdx], [colKey]: parsed };
      setRows(updated);
      onSave(updated);
    } else if (isObject) {
      const updatedRows = [...rows];
      updatedRows[rowIdx] = { ...updatedRows[rowIdx], [colKey]: parsed };
      setRows(updatedRows);
      // Rekonstruksi kembali ke bentuk Object
      const reconstructed: Record<string, any> = {};
      updatedRows.forEach((r) => { if (r.key) reconstructed[r.key] = r.value; });
      onSave(reconstructed);
    }
    setEditingCell(null);
  };

  // Tambah Baris Baru
  const handleAddRow = () => {
    if (isArray) {
      const newRow: any = {};
      columns.forEach((c) => (newRow[c] = ''));
      const updated = [...rows, newRow];
      setRows(updated);
      onSave(updated);
    } else if (isObject) {
      const updated = [...rows, { key: `new_key_${rows.length + 1}`, value: '' }];
      setRows(updated);
      const reconstructed: Record<string, any> = {};
      updated.forEach((r) => { if (r.key) reconstructed[r.key] = r.value; });
      onSave(reconstructed);
    }
  };

  // Hapus Baris
  const handleDeleteRow = (idx: number) => {
    if (!confirm(`Hapus baris ke-${idx + 1}?`)) return;
    const updated = rows.filter((_, i) => i !== idx);
    setRows(updated);

    if (isArray) {
      onSave(updated);
    } else if (isObject) {
      const reconstructed: Record<string, any> = {};
      updated.forEach((r) => { if (r.key) reconstructed[r.key] = r.value; });
      onSave(reconstructed);
    }
  };

  // Tambah Kolom Baru (khusus Array)
  const handleAddColumn = () => {
    if (!newColName.trim() || columns.includes(newColName.trim())) return;
    const name = newColName.trim();
    setColumns([...columns, name]);
    setNewColName('');
  };

  // Hapus Kolom (khusus Array)
  const handleDeleteColumn = (col: string) => {
    if (!confirm(`Hapus kolom "${col}" dari seluruh baris data?`)) return;
    const updatedCols = columns.filter((c) => c !== col);
    const updatedRows = rows.map((r) => {
      const copy = { ...r };
      delete copy[col];
      return copy;
    });
    setColumns(updatedCols);
    setRows(updatedRows);
    onSave(updatedRows);
  };

  // Jika berupa String skalar sederhana
  if (!isArray && !isObject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-muted-foreground">Tipe: Single String / Primitive</span>
          <button onClick={onDeleteKey} className="text-xs font-bold text-destructive hover:underline">Hapus Key</button>
        </div>
        <textarea
          rows={6}
          defaultValue={String(kvItem.value ?? '')}
          onBlur={(e) => onSave(e.target.value)}
          className="w-full p-3 font-mono text-xs rounded-xl border border-border bg-background"
          placeholder="Ketik nilai string di sini..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Header di Atas Tabel */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            ＋ Tambah Baris
          </button>

          {isArray && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Nama kolom baru..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background"
              />
              <button
                onClick={handleAddColumn}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                ＋ Kolom
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onDeleteKey}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          🗑️ Hapus Key Ini
        </button>
      </div>

      {/* Spreadsheet Table Interaktif */}
      <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-inner max-h-[580px]">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead className="bg-muted/80 border-b border-border sticky top-0 z-10 backdrop-blur-md uppercase text-muted-foreground font-semibold">
            <tr>
              <th className="p-3 border-r border-border w-12 text-center">#</th>
              {columns.map((col) => (
                <th key={col} className="p-3 border-r border-border font-mono whitespace-nowrap min-w-[150px]">
                  <div className="flex items-center justify-between gap-2">
                    <span>{col}</span>
                    {isArray && (
                      <button
                        onClick={() => handleDeleteColumn(col)}
                        title="Hapus Kolom Ini"
                        className="opacity-40 hover:opacity-100 text-destructive text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 text-right w-16 sticky right-0 bg-muted/90">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-8 text-center text-xs text-muted-foreground font-sans">
                  Data kosong. Klik "+ Tambah Baris" untuk mengisi.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 border-r border-border text-center text-muted-foreground bg-muted/10 font-sans">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col) => {
                    const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colKey === col;
                    const cellVal = row[col];

                    return (
                      <td
                        key={col}
                        onClick={() => {
                          if (!isEditing) {
                            setEditingCell({ rowIdx, colKey: col });
                            setEditVal(typeof cellVal === 'object' && cellVal !== null ? JSON.stringify(cellVal) : String(cellVal ?? ''));
                          }
                        }}
                        className="p-2 border-r border-border cursor-pointer hover:bg-primary/5 min-w-[150px] max-w-sm"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => handleSaveCell(rowIdx, colKey: col)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(rowIdx, colKey: col);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-1 text-xs rounded border border-primary bg-background text-foreground"
                            />
                            <button
                              onClick={() => handleSaveCell(rowIdx, colKey: col)}
                              className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground font-bold"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <div className="truncate">
                            {cellVal === undefined || cellVal === null || cellVal === '' ? (
                              <span className="text-muted-foreground/30 italic">-</span>
                            ) : typeof cellVal === 'boolean' ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cellVal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {cellVal ? 'TRUE' : 'FALSE'}
                              </span>
                            ) : typeof cellVal === 'object' ? (
                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {JSON.stringify(cellVal)}
                              </span>
                            ) : (
                              String(cellVal)
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-right whitespace-nowrap sticky right-0 bg-card border-l border-border font-sans">
                    <button
                      onClick={() => handleDeleteRow(rowIdx)}
                      className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px] font-bold"
                      title="Hapus Baris"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground italic font-sans">
        💡 <b>Tips:</b> Klik pada sel manapun untuk mengedit nilainya langsung. Tekan <code>Enter</code> untuk menyimpan.
      </p>
    </div>
  );
}