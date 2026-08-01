'use client';

import { useState } from 'react';
import { SmilePlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export function ApiController() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCreateEmojis = async () => {
    const confirm = await Swal.fire({
      title: 'Generate Discord Emoji?',
      text: 'Semua logo tim yang terdaftar akan didownload dan di-upload otomatis menjadi Custom Emoji di server Discord.',
      icon: 'question',
      background: '#171717',
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Ya, Jalankan!',
      cancelButtonText: 'Batal',
    });

    if (!confirm.isConfirmed) return;

    setIsSyncing(true);

    try {
      const res = await fetch('/api/create-emojis');
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: 'Proses Selesai!',
          html: `<div class="text-left text-xs text-neutral-300 font-mono bg-neutral-900 p-3 rounded-lg border border-neutral-800 max-h-48 overflow-y-auto">${data.summary}<br/><br/>${data.logs.join('<br/>')}</div>`,
          icon: 'success',
          background: '#171717',
          color: '#fff',
          confirmButtonColor: '#3b82f6',
        });
      } else {
        throw new Error(data.error || data.message || 'Gagal menjalankan API');
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Terjadi Kesalahan',
        text: err.message || 'Gagal memanggil API create-emojis.',
        icon: 'error',
        background: '#171717',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleCreateEmojis}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl text-sm font-medium transition disabled:opacity-50 cursor-pointer"
    >
      {isSyncing ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      ) : (
        <SmilePlus className="w-4 h-4 text-blue-400" />
      )}
      <span>{isSyncing ? 'Mengkoneksikan Discord...' : 'Generate Emoji Discord'}</span>
    </button>
  );
}
