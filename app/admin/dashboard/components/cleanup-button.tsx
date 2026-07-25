'use client';
import { useState } from 'react';
import { DatabaseZap, Loader2 } from 'lucide-react'; // Pakai icon DatabaseZap biar lebih keren
import { FeedbackModal, FeedbackState } from './feedback-modal';

export function CleanupButton() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cleanup-orphans', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Database Berhasil Direset',
          message: 'Sistem telah menghapus data lama dan membangun ulang index Global berdasarkan tim yang aktif saat ini.',
          details: [
            `Total Tim: ${data.stats.totalTimDitemukan}`,
            `Pemain Tervalidasi & Masuk Global: ${data.stats.totalPemainDirebuild}`,
            `Status: ${data.stats.status}`,
          ],
        });
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Gagal Rebuild Database',
          message: data.error || 'Terjadi kesalahan saat memproses rebuild data.',
        });
      }
    } catch (err) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCleanup}
        disabled={loading}
        className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50"
        title="Nuke & Rebuild Global Database"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
        <span className="hidden sm:inline">{loading ? 'Memproses...' : 'Rebuild Database'}</span>
      </button>

      <FeedbackModal data={feedback} onClose={() => setFeedback(null)} />
    </>
  );
        }
