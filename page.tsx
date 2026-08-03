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
    // Kunci scroll saat modal muncul
    if (data && data.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; // Balikin ke default (string kosong lebih aman dari 'unset')
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [data]);

  if (!data || !data.isOpen) return null;

  const isSuccess = data.type === 'success';

  return (
    <div
      // PERBAIKAN: z-[9999] agar dipastikan nampil paling depan menutupi apapun!
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
            isSuccess
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>

        <h3 className="text-lg font-bold text-white mb-2">{data.title}</h3>
        <p className="text-sm text-neutral-300 leading-relaxed mb-5">{data.message}</p>

        {data.details && data.details.length > 0 && (
          <div className="w-full bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 mb-5 text-left text-xs text-neutral-400 space-y-1.5">
            {data.details.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSuccess ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="leading-snug break-words">{item}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition shadow-lg ${
            isSuccess
              ? 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          Tutup Panel
        </button>
      </div>
    </div>
  );
}
