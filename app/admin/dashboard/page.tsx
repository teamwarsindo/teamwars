'use client';

import { useAdminTeams } from './hooks/use-admin-teams';
import { AdminTable } from './components/admin-table';
import { ProofModal } from './components/proof-modal';
import { RosterModal } from './components/roster-modal';
import { CleanupButton } from './components/cleanup-button';
import { ApiController } from './components/api-controller'; // 👈 IMPORT KONTROLER
import { Search, LogOut, RefreshCw, Trophy } from 'lucide-react';

export default function AdminDashboardPage() {
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
    <main className="min-h-screen bg-neutral-950 text-white font-sans">
      <title>Dashboard Admin — TWI Season 7</title>
      
      <div className="w-[95%] max-w-none mx-auto px-4 py-8">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Trophy className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Team Wars Indonesia Season 7
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Dashboard Admin
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Total <span className="text-white font-semibold">{totalCount}</span> tim
              terdaftar di Vercel KV Redis
            </p>
          </div>

          {/* Action Control Panel */}
          <div className="flex flex-wrap items-center gap-3">
            <ApiController /> {/* 👈 TOMBOL API KONTROLER MANUAL DISCORD EMOJI */}
            <CleanupButton />
            
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-sm font-medium transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-rose-600 hover:border-rose-600 hover:text-white rounded-xl text-sm font-medium transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Control Bar: Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama tim atau email..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition"
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
    </main>
  );
                }
              
