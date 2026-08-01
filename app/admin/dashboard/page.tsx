'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminTeams } from './hooks/use-admin-teams';
import { AdminTable } from './components/admin-table';
import { ProofModal } from './components/proof-modal';
import { RosterModal } from './components/roster-modal';
import { DashboardHeader } from './components/dashboard-header';
import { DashboardControls } from './components/dashboard-controls';
import { AdminLoginForm } from '@/components/admin-login-form';

function DashboardContent() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  const {
    teams,
    totalCount,
    search,
    setSearch,
    filter,
    setFilter,
    selectedRoster,
    setSelectedRoster,
    previewImg,
    setPreviewImg,
    isLoading,
    refresh,
    logout,
  } = useAdminTeams();

  // Cek apakah cookie admin_session aktif dengan memanggil endpoint atau cek state
  useEffect(() => {
    // Kita coba fetch state / verifikasi ke API atau cek sederhana
    // Karena useAdminTeams biasanya akan gagal/return unauthorized jika cookie tidak ada,
    // kita bisa buat state pengecekan sesi sederhana atau cek lewat endpoint auth.
    async function verifyAuth() {
      try {
        const res = await fetch('/api/admin/verify'); // atau endpoint yang lempar 401 jika belum login
        if (res.ok) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    verifyAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400 text-xs">
        ⏳ Memverifikasi Sesi Admin...
      </div>
    );
  }

  // Jika belum login, tampilkan form login persis seperti di Roulette
  if (!isAuthorized) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-neutral-950 text-white px-4">
        <div className="w-full max-w-md">
          <AdminLoginForm
            title="Admin Dashboard"
            subtitle="Masukkan kredensial panitia untuk mengakses dashboard"
            buttonText="Masuk ke Dashboard"
            onSuccess={() => setIsAuthorized(true)}
          />
        </div>
      </main>
    );
  }

  // Jika sudah login, tampilkan dashboard lengkap
  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans">
      <title>Dashboard Admin — TWI Season 7</title>
      
      <div className="w-[95%] max-w-none mx-auto px-4 py-8">
        
        {/* Header Dashboard */}
        <DashboardHeader
          totalCount={totalCount}
          isLoading={isLoading}
          onRefresh={refresh}
          onLogout={() => {
            logout();
            setIsAuthorized(false);
          }}
        />

        {/* Control Bar: Search & Filter */}
        <DashboardControls
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          totalCount={totalCount}
        />

        {/* Tabel Interaktif */}
        <AdminTable
          teams={teams}
          isLoading={isLoading}
          onPreviewProof={(url) => setPreviewImg(url)}
          onSelectRoster={(team) => setSelectedRoster(team)}
          onRefreshData={refresh}
        />

        {/* Modal Bukti Transfer */}
        <ProofModal imageUrl={previewImg} onClose={() => setPreviewImg(null)} />

        {/* Modal Detail Roster */}
        <RosterModal team={selectedRoster} onClose={() => setSelectedRoster(null)} />
      </div>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-xs">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
