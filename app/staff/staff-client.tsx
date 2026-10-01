'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefereeTab } from './_components/referee-tab';
import { StreamerTab } from './_components/streamer-tab';
import { StaffClaimApprovalTab } from './_components/staff-claim-approval-tab';

interface StaffClientContentProps {
  isAdmin: boolean;
}

export default function StaffClientContent({ isAdmin }: StaffClientContentProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer' | 'claims'>('referee');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');

  const [rosterData, setRosterData] = useState<any>(null);
  const [claimsData, setClaimsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  const fetchRoster = async () => {
    try {
      setIsLoading(true);
      const url = token
        ? `/api/tournament/staff/roster?token=${encodeURIComponent(token)}`
        : '/api/tournament/staff/roster';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setRosterData(json);
      }
    } catch (err) {
      console.error('[STAFF ROSTER CLIENT ERROR]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClaims = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/tournament/staff/payroll/action', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setClaimsData(json.requests || []);
      }
    } catch (err) {
      console.error('[STAFF CLAIMS CLIENT ERROR]:', err);
    }
  };

  const handleRefresh = () => {
    startTransition(() => {
      fetchRoster();
      if (isAdmin) fetchClaims();
    });
  };

  useEffect(() => {
    fetchRoster();
    if (isAdmin) fetchClaims();
  }, [token, isAdmin]);

  const pendingClaimsCount = claimsData.filter((r) => r.status === 'PENDING').length;
  const isTokenMode = Boolean(token && rosterData?.currentVerifiedId);

  // Opsi dropdown seleksi staf berdasarkan tab aktif
  const staffOptions =
    activeTab === 'referee'
      ? (rosterData?.referees || []).map((r: any) => ({
          id: r.discordId,
          name: r.discordName,
        }))
      : (rosterData?.streamers || []).map((s: any) => ({
          id: s.discordId,
          name: s.discordName,
        }));

  return (
    <div className="w-full space-y-6">
      {/* 1. KONTROL UTAMA & NAVIGASI */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!isTokenMode ? (
          <div className="inline-flex rounded-xl bg-card/60 p-1.5 border border-border/80 backdrop-blur-md">
            <button
              onClick={() => {
                setActiveTab('referee');
                setSelectedStaffId('ALL');
              }}
              className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'referee'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⚖️ Wasit ({rosterData?.referees?.length || 0})
            </button>
            <button
              onClick={() => {
                setActiveTab('streamer');
                setSelectedStaffId('ALL');
              }}
              className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'streamer'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🎥 Streamer ({rosterData?.streamers?.length || 0})
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('claims')}
                className={`relative rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'claims'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📥 Klaim Honor
                {pendingClaimsCount > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                    {pendingClaimsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-bold text-primary">
            🔒 Mode Akses Staf Terverifikasi
          </div>
        )}

        {/* 2. DROPDOWN SELEKSI STAF TUNGGAL & REFRESH */}
        {!isTokenMode && activeTab !== 'claims' && (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="h-10 rounded-xl bg-card border border-border/80 px-3 pr-8 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
              >
                <option value="ALL">Semua {activeTab === 'referee' ? 'Wasit' : 'Streamer'}</option>
                {staffOptions.map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                <span className="text-[10px]">▼</span>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isPending || isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/80 text-foreground hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50"
              title="Perbarui Data"
            >
              <span className={`text-sm ${isPending || isLoading ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. KONTEN TAB UTAMA */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse">
          ⏳ Memuat Direktori Staf TWI...
        </div>
      ) : (
        <>
          {activeTab === 'referee' && (
            <RefereeTab
              referees={rosterData?.referees || []}
              token={token}
              isAdmin={isAdmin}
              selectedStaffId={selectedStaffId}
              currentVerifiedId={rosterData?.currentVerifiedId}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'streamer' && (
            <StreamerTab
              streamers={rosterData?.streamers || []}
              selectedStaffId={selectedStaffId}
            />
          )}

          {activeTab === 'claims' && isAdmin && (
            <StaffClaimApprovalTab
              claims={claimsData}
              onRefresh={() => {
                fetchClaims();
                fetchRoster();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
