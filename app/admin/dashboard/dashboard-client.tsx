'use client';

import { useAdminTeams } from './hooks/use-admin-teams';
import { AdminTable } from './components/admin-table';
import { ProofModal } from './components/proof-modal';
import { RosterModal } from './components/roster-modal';
import { ApiController } from './components/api-controller';
import { CleanupButton } from './components/cleanup-button';
import { TopBar, Footer } from "@/components/layout-shared";
import { Search, RefreshCw, LogOut, Trophy } from 'lucide-react';

export default function DashboardClientContent() {
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

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Admin Dashboard" />

      <div className="relative z-10 w-[95%] max-w-7xl mx-auto px-4 py-8 flex-1">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Trophy className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Team Wars Indonesia Season 7
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Dashboard Admin
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total <span className="text-foreground font-semibold">{totalCount}</span> tim
              terdaftar di Vercel KV Redis
            </p>
          </div>

          {/* Action Control Panel */}
          <div className="flex flex-wrap items-center gap-3">
            <ApiController />
            <CleanupButton />
            
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            
            <button
              onClick={() => {
                logout();
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-muted-foreground hover:bg-destructive hover:border-destructive hover:text-white rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama tim atau email..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Semua Tim ({totalCount})</option>
            <option value="complete">Roster Lengkap Verified</option>
            <option value="incomplete">Roster Belum Lengkap</option>
          </select>
        </div>

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

      <Footer />
    </main>
  );
        }
