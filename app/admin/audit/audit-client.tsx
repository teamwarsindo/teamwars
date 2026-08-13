'use client';

import { useState, useEffect } from 'react';
import { DIVISION_MAP } from '@/lib/types/tournament';

export default function AuditClientContent() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'kv-explorer'>('schedules');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: { totalMatches: number; mismatchedCount: number; totalKeysInKv: number };
    schedules: any[];
    keysMeta: { key: string; type: string }[];
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [fieldToDelete, setFieldToDelete] = useState('');

  // Fetch Data Audit
  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kv-audit');
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      alert('Gagal mengambil data audit KV');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  // 1. Auto Fix Normalisasi Nama Group
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

  // 2. Hapus Kolom / Field Spesiifk
  const handleDeleteField = async () => {
    if (!fieldToDelete) return alert('Masukkan nama field/kolom');
    if (!confirm(`Hapus kolom "${fieldToDelete}" dari seluruh item match?`)) return;

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

  // 3. Hapus 1 Baris Match
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm(`Hapus match ID: ${matchId}?`)) return;
    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const json = await res.json();
      alert(json.message || json.error);
      fetchAuditData();
    } catch {
      alert('Gagal menghapus match');
    }
  };

  // 4. Hapus Single Key KV Global
  const handleDeleteKvKey = async (kvKey: string) => {
    if (!confirm(`Hapus KEY KV global: "${kvKey}"?`)) return;
    try {
      const res = await fetch('/api/admin/kv-audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kvKey }),
      });
      const json = await res.json();
      alert(json.message || json.error);
      fetchAuditData();
    } catch {
      alert('Gagal menghapus Key KV');
    }
  };

  if (loading) return <div className="text-center py-12 text-xs font-bold text-primary animate-pulse">⏳ Memindai Upstash KV...</div>;

  const filteredSchedules = (data?.schedules || []).filter((m) =>
    `${m.id} ${m.teamAName} ${m.teamBName} ${m.groupName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Match (Schedules)</p>
          <p className="text-2xl font-black text-foreground mt-1">{data?.summary.totalMatches || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10">
          <p className="text-xs text-destructive uppercase font-semibold">Group Mismatch ("Group A/B")</p>
          <p className="text-2xl font-black text-destructive mt-1">{data?.summary.mismatchedCount || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Key di Upstash KV</p>
          <p className="text-2xl font-black text-primary mt-1">{data?.summary.totalKeysInKv || 0}</p>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'schedules' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            📋 Schedule Matches
          </button>
          <button
            onClick={() => setActiveTab('kv-explorer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'kv-explorer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            🔑 KV Keys Explorer
          </button>
        </div>

        {activeTab === 'schedules' && (
          <div className="flex flex-wrap items-center gap-2">
            {data?.summary.mismatchedCount ? (
              <button
                onClick={handleNormalizeGroups}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
              >
                ⚡ Fix Mismatch ({data.summary.mismatchedCount})
              </button>
            ) : null}

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Nama kolom hapus (mis: oldGroup)"
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
        )}
      </div>

      {/* TAB 1: SCHEDULE MATCHES TABLE */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="🔍 Cari Match ID / Nama Tim / Group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
          />

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Match Date</th>
                  <th className="p-3">Week</th>
                  <th className="p-3">Group Name</th>
                  <th className="p-3">Team A vs Team B</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSchedules.map((m) => {
                  const isMismatched = m.groupName === 'Group A' || m.groupName === 'Group B';
                  return (
                    <tr key={m.id} className={isMismatched ? 'bg-amber-500/10' : 'hover:bg-muted/30'}>
                      <td className="p-3 font-mono font-bold text-primary">{m.id}</td>
                      <td className="p-3 whitespace-nowrap">{m.matchDate ? new Date(m.matchDate).toLocaleString('id-ID') : '-'}</td>
                      <td className="p-3 font-semibold">{m.weekNumber ?? '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMismatched
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          {m.groupName}
                        </span>
                      </td>
                      <td className="p-3 font-medium">
                        {m.teamAName} <span className="text-muted-foreground">vs</span> {m.teamBName}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteMatch(m.id)}
                          className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-[11px] font-bold"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KV KEYS EXPLORER */}
      {activeTab === 'kv-explorer' && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="p-3">Key Name</th>
                <th className="p-3">Tipe Data</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.keysMeta || []).map((k) => (
                <tr key={k.key} className="hover:bg-muted/30">
                  <td className="p-3 font-mono font-bold text-foreground">{k.key}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground uppercase">{k.type}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteKvKey(k.key)}
                      className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-[11px] font-bold"
                    >
                      🗑️ Flush Key
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}