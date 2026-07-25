'use client';
import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { FeedbackModal, FeedbackState } from './feedback-modal';

export function CleanupButton() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleCleanup = async () => {
    if (!confirm('Apakah Anda yakin ingin membersihkan data residu (orphan data) Discord dan IGN dari sistem?')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/cleanup-orphans', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Pembersihan Berhasil',
          message: 'Data residu sistem telah berhasil dibersihkan.',
          details: [
            `Akun Discord Dihapus: ${data.stats.sampahDiscordDihapus}`,
            `IGN Dihapus: ${data.stats.sampahIgnDihapus}`,
            `Total Tim Diperiksa: ${data.stats.totalTimDiperiksa}`,
          ],
        });
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Gagal Membersihkan Data',
          message: data.error || 'Terjadi kesalahan saat memproses data residu.',
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
        title="Bersihkan Data Residu Sistem"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        <span className="hidden sm:inline">{loading ? 'Memproses...' : 'Bersihkan Data'}</span>
      </button>

      <FeedbackModal data={feedback} onClose={() => setFeedback(null)} />
    </>
  );
    }
