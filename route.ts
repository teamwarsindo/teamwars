'use client';

import { X } from 'lucide-react';

interface ProofModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ProofModal({ imageUrl, onClose }: ProofModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-800">
          <h3 className="text-sm font-semibold text-white">Bukti Pembayaran Pendaftaran</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
          <img
            src={imageUrl}
            alt="Bukti Transfer"
            className="max-h-[75vh] w-auto object-contain rounded-xl"
          />
        </div>
        <p className="text-center mt-3 text-xs text-neutral-500">
          Klik di luar area gambar untuk menutup preview
        </p>
      </div>
    </div>
  );
}
