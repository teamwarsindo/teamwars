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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // State Edit Cell
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // State Tambah Key Baru
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('string');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchKVData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kv-audit');
      const json = await res.json();
      if (json.success) setItems(json.items || []);
    } catch {
      alert('Gagal mengambil data KV');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKVData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(item.value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleStartEdit = (item: KVItem) => {
    setEditingKey(item.key);
    setEditValue(typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : String(item.value ?? ''));
  };

  const handleSaveEdit = async (item: KVItem) => {
    setIsSaving(true);
    try {
      let finalVal: any = editValue;
      try {
        finalVal = JSON.parse(editValue);
      } catch {
        finalVal = editValue;
      }

      const res = await fetch('/api/admin/kv-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: item.key, type: item.type, value: finalVal }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.key === item.key ? { ...i, value: finalVal } : i))
        );
        setEditingKey(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setIsSaving(true);
    try {
      let finalVal: any = newValue;
      try {
        finalVal = JSON.parse(newValue);
      } catch {
        finalVal = newValue;
      }

      const res = await fetch('/api/admin/kv-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), type: newType, value: finalVal }),
      });

      if (res.ok) {
        setNewKey('');
        setNewValue('');
        setShowAddForm(false);
        fetchKVData();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Hapus key "${key}" secara permanen?`)) return;

    const res = await fetch('/api/admin/kv-audit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.key !== key));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar title="Vercel KV Spreadsheet Manager" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <input
              type="text"
              placeholder="🔍 Cari Key atau Value..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-sm px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Total: <b>{items.length}</b> Keys
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {showAddForm ? '✕ Tutup Form' : '＋ Tambah Key Baru'}
            </button>
            <button
              onClick={fetchKVData}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-background hover:bg-muted"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Form Tambah Key Baru */}
        {showAddForm && (
          <form onSubmit={handleCreateKey} className="p-4 bg-card border border-border rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-primary tracking-wider">Tambah Entry KV Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nama Key (misal: config:app)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                required
                className="px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-border bg-background"
              >
                <option value="string">String / JSON</option>
                <option value="hash">Hash (Map Object)</option>
              </select>
              <input
                type="text"
                placeholder='Value (String biasa atau {"json": true})'
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
                className="px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Key'}
              </button>
            </div>
          </form>
        )}

        {/* Tabel Excel-like */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-inner max-h-[650px]">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-muted/80 border-b border-border sticky top-0 z-10 backdrop-blur-md uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="p-3 border-r border-border w-12 text-center">#</th>
                <th className="p-3 border-r border-border w-1/4 font-mono">Key</th>
                <th className="p-3 border-r border-border w-24">Tipe</th>
                <th className="p-3 border-r border-border">Value (Klik 2x / Klik Edit)</th>
                <th className="p-3 text-right w-28 sticky right-0 bg-muted/90">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs font-bold animate-pulse text-muted-foreground">
                    Memuat data Upstash KV...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada key yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isEditing = editingKey === item.key;
                  return (
                    <tr key={item.key} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border text-center text-muted-foreground bg-muted/10 font-sans">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-r border-border font-bold text-foreground break-all">
                        {item.key}
                      </td>
                      <td className="p-3 border-r border-border">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          {item.type}
                        </span>
                      </td>
                      <td
                        className="p-3 border-r border-border cursor-pointer"
                        onDoubleClick={() => !isEditing && handleStartEdit(item)}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              rows={4}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full p-2 text-xs font-mono rounded border border-primary bg-background text-foreground"
                            />
                            <div className="flex gap-1 justify-end font-sans">
                              <button
                                onClick={() => handleSaveEdit(item)}
                                disabled={isSaving}
                                className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              >
                                ✓ Simpan
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                className="px-2.5 py-1 text-[10px] font-bold bg-muted text-muted-foreground rounded hover:bg-muted/80"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="max-h-24 overflow-y-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                            {typeof item.value === 'object'
                              ? JSON.stringify(item.value, null, 2)
                              : String(item.value ?? '')}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap sticky right-0 bg-card border-l border-border font-sans">
                        <div className="flex items-center justify-end gap-1">
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] font-bold"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.key)}
                            className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px] font-bold"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}