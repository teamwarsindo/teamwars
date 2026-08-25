"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { MatchSearchInput } from "./_components/match-search-input";
import { MatchChatCard } from "./_components/match-chat-card";
import { ChatLogMessage } from "./_components/chat-message-item";
import { MessageSquare, Database } from "lucide-react";
import Swal from "sweetalert2";

function MatchLogViewerContent() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [activeLogs, setActiveLogs] = useState<ChatLogMessage[] | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // 1. Fetch seluruh daftar jadwal match
  useEffect(() => {
    async function loadSchedules() {
      try {
        const res = await fetch("/api/admin/match-logs");
        const json = await res.json();
        if (json.schedules) setSchedules(json.schedules);
      } catch (err) {
        console.error("Gagal load schedules:", err);
      }
    }
    loadSchedules();
  }, []);

  // 2. Fetch data log chat saat salah satu match dipilih
  useEffect(() => {
    if (!selectedMatchId) {
      setActiveLogs(null);
      return;
    }

    async function loadLogs() {
      try {
        setLoadingChat(true);
        const res = await fetch(`/api/admin/match-logs?matchId=${selectedMatchId}`);
        const json = await res.json();
        setActiveLogs(json.logs || []);
      } catch (err) {
        console.error("Gagal load logs:", err);
        setActiveLogs([]);
      } finally {
        setLoadingChat(false);
      }
    }
    loadLogs();
  }, [selectedMatchId]);

  const activeMatch = useMemo(
    () => schedules.find((m) => m.id === selectedMatchId),
    [schedules, selectedMatchId]
  );

  // 3. Handler Eksekusi Backup dari Discord
  const handleBackupNow = async () => {
    if (!activeMatch) return;
    const channelId = activeMatch.discordChannelId;
    if (!channelId) {
      Swal.fire({
        title: "Channel Belum Terhubung",
        text: "Match ini belum memiliki Discord Channel ID di jadwal database.",
        icon: "warning",
        confirmButtonColor: "#AA1348",
      });
      return;
    }

    try {
      setIsBackingUp(true);
      const res = await fetch("/api/admin/match-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: activeMatch.id,
          channelId,
          week: activeMatch.weekNumber || 1,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setActiveLogs(json.logs);
        Swal.fire({
          title: "Backup Berhasil!",
          text: `Tersimpan ${json.count} pesan dan bukti gambar ke database.`,
          icon: "success",
          confirmButtonColor: "#AA1348",
        });
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        title: "Gagal Backup",
        text: err.message || "Terjadi kendala saat mencadangkan pesan.",
        icon: "error",
        confirmButtonColor: "#AA1348",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // 4. Handler Hapus Channel dari Discord Server
  const handleDeleteChannel = async () => {
    if (!activeMatch) return;
    try {
      const res = await fetch("/api/admin/match-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: activeMatch.id,
          channelId: activeMatch.discordChannelId,
        }),
      });

      if (res.ok) {
        Swal.fire({
          title: "Channel Dihapus!",
          text: "Channel Discord berhasil dihapus dari server.",
          icon: "success",
          confirmButtonColor: "#AA1348",
        });
      } else {
        const json = await res.json();
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        title: "Gagal Menghapus",
        text: err.message || "Terjadi kendala saat menghapus channel di server.",
        icon: "error",
        confirmButtonColor: "#AA1348",
      });
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
      <HeroHeader showDetails={false} />

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-xl font-black tracking-tight">Match Discord Log Archive</h1>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Cari pertandingan untuk melihat riwayat percakapan Discord dan bukti duel.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border bg-primary/10 text-primary border-primary/30 w-fit">
          <Database className="h-3 w-3" /> Mode Arsip Terproteksi
        </span>
      </div>

      {/* Komponen Pencarian Instan Match */}
      <MatchSearchInput schedules={schedules} onSelectMatch={setSelectedMatchId} />

      {/* Panel Log Match atau Placeholder */}
      {selectedMatchId && activeMatch ? (
        <MatchChatCard
          match={activeMatch}
          logs={activeLogs}
          loadingChat={loadingChat}
          isBackingUp={isBackingUp}
          onBackup={handleBackupNow}
          onDeleteChannel={handleDeleteChannel}
        />
      ) : (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl p-6 text-muted-foreground space-y-1">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-xs font-bold text-foreground">Pilih Pertandingan</p>
          <p className="text-[11px]">Ketik nama tim atau wasit di kolom pencarian di atas untuk membuka log.</p>
        </div>
      )}
    </main>
  );
}

export default function MatchLogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar title="Match Logs Archive" />
      <Suspense
        fallback={
          <div className="flex-1 py-20 text-center text-xs font-bold text-muted-foreground animate-pulse">
            ⏳ Memuat Log Archive...
          </div>
        }
      >
        <MatchLogViewerContent />
      </Suspense>
      <Footer />
    </div>
  );
}
