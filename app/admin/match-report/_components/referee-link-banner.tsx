'use client';

import { useState } from 'react';

interface RefereeLinkBannerProps {
  isRefereeMode: boolean;
  selectedMatchId: string;
}

export function RefereeLinkBanner({ isRefereeMode, selectedMatchId }: RefereeLinkBannerProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleGenerateRefereeLink = async () => {
    if (!selectedMatchId) return;
    setGeneratingLink(true);
    try {
      const res = await fetch('/api/admin/match-report/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: selectedMatchId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        await navigator.clipboard.writeText(data.url);
        setCopyStatus('Link Disalin! ✅');
        setTimeout(() => setCopyStatus(null), 3000);
      } else {
        setCopyStatus('Gagal Buat Link ❌');
        setTimeout(() => setCopyStatus(null), 3000);
      }
    } catch {
      setCopyStatus('Error ❌');
      setTimeout(() => setCopyStatus(null), 3000);
    } finally {
      setGeneratingLink(false);
    }
  };

  if (isRefereeMode) {
    return (
      <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>🛡️</span>
          <span>Akses Pengisian Wasit Resmi</span>
        </span>
        <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-700 dark:text-sky-300">
          Referee Token Active
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base shrink-0">🛡️</span>
        <div className="min-w-0">
          <div className="text-xs font-black text-foreground truncate">Akses Mandiri Wasit</div>
          <div className="text-[10px] text-muted-foreground truncate">
            Bagikan link ini agar wasit bisa input tanpa login admin
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerateRefereeLink}
        disabled={generatingLink}
        className={`ml-3 px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
          copyStatus
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30'
        }`}
      >
        <span>{copyStatus ? '✓' : '🔗'}</span>
        <span>{generatingLink ? 'Membuat...' : copyStatus || 'Salin Link Wasit'}</span>
      </button>
    </div>
  );
    }
