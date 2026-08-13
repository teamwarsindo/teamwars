'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface FeedbackState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: string[];
}

interface FeedbackModalProps {
  data: FeedbackState | null;
  onClose: () => void;
}

export function FeedbackModal({ data, onClose }: FeedbackModalProps) {
  useEffect(() => {
    if (data && data.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [data]);

  if (!data || !data.isOpen) return null;

  const isSuccess = data.type === 'success';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200 whitespace-normal"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm sm:max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center overflow-hidden whitespace-normal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Silang Top-Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Status Presisi di Tengah */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border shrink-0 ${
            isSuccess
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>

        {/* Judul Simetris */}
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight w-full text-center whitespace-normal break-words">
          {data.title}
        </h3>

        {/* Deskripsi Memaksa Break Word agar Tidak Offscreen */}
        <div className="w-full text-center mb-6 px-1">
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-normal break-words break-all text-center">
            {data.message}
          </p>
        </div>

        {data.details && data.details.length > 0 && (
          <div className="w-full bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 mb-6 text-left text-xs text-neutral-400 space-y-2 whitespace-normal">
            {data.details.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isSuccess ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="leading-relaxed break-words break-all">{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tombol Aksi Simetris Full Width */}
        <button
          onClick={onClose}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition shadow-lg active:scale-[0.98] ${
            isSuccess
              ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/10'
              : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10'
          }`}
        >
          Tutup Panel
        </button>
      </div>
    </div>
  );
}
