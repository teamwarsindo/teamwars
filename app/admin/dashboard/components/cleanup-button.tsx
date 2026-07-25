'use client';
import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export function CleanupButton() {
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('Yakin ingin menyapu bersih data Discord & IGN yang nyangkut/yatim?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cleanup-orphans', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert(`Berhasil! Dihapus: ${data.stats.sampahDiscordDihapus} Discord & ${data.stats.sampahIgnDihapus} IGN Yatim.`);
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCleanup}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      title="Bersihkan Data Lama yang Nyangkut"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      <span className="hidden sm:inline">{loading ? 'Membersihkan...' : 'Sapu Data'}</span>
    </button>
  );
}
