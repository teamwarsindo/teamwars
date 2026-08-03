'use client';

import { useState, useEffect } from 'react';
import { DatabaseZap, Loader2, AlertTriangle, X } from 'lucide-react';
import { FeedbackModal, FeedbackState } from './feedback-modal';

export function CleanupButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Kunci scroll saat modal konfirmasi atau feedback terbuka
  useEffect(() => {
    if (showConfirm || (feedback && feedback.isOpen)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirm, feedback]);

  const handleExecuteCleanup = async () => {
    setShowConfirm(false);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/cleanup-orphans', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Database Berhasil Ditata Ulang',
          message: 'Seluruh Set Global telah ditata ulang dan seluruh key spam player telah dibasmi.',
          details: [
            `Total Tim Aktif: ${data.stats.totalTim}`,
            `Pemain Masuk Global: ${data.stats.totalPemain}`,
            `Key Spam Dihapus: ${data.stats.spamPlayerKeysDihapus}`,
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
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50"
        title="Rebuild & Rapikan Global Database"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
        <span className="hidden sm:inline">{loading ? 'Memproses...' : 'Rebuild Database'}</span>
      </button>

      {/* MODAL KONFIRMASI SEBELUM CLEANUP */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Konfirmasi Rebuild Database</h3>
            <p className="text-sm text-neutral-300 leading-relaxed mb-6">
              Apakah Anda yakin ingin membangun ulang seluruh Index Global Database dan menghapus seluruh data residu/spam?
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteCleanup}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition shadow-lg"
              >
                Ya, Rebuild
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FEEDBACK HASIL */}
      <FeedbackModal data={feedback} onClose={() => setFeedback(null)} />
    </>
  );
              }
