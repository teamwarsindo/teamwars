"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import {
  MessageSquare,
  Search,
  Calendar,
  ShieldAlert,
  Database,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  Users,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";

function MatchLogViewerContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "ALL">(1);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  const [activeLogs, setActiveLogs] = useState<any[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 1. Fetch seluruh list jadwal
  useEffect(() => {
    async function loadSchedules() {
      try {
        setLoadingList(true);
        const res = await fetch("/api/admin/match-logs");
        const json = await res.json();
        if (json.schedules) {
          setSchedules(json.schedules);
          if (json.schedules.length > 0) {
            setSelectedWeek(json.schedules[0].weekNumber || 1);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    }
    loadSchedules();
  }, []);

  // 2. Fetch data log saat match dipilih
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
        console.error(err);
        setActiveLogs([]);
      } finally {
        setLoadingChat(false);
      }
    }
    loadLogs();
  }, [selectedMatchId]);

  // Ekstraksi daftar week
  const availableWeeks = useMemo(() => {
    const weeks = Array.from(new Set(schedules.map((m) => m.weekNumber || 1))).sort((a, b) => a - b);
    return weeks.length > 0 ? weeks : [1];
  }, [schedules]);

  // Saringan list match di bagian depan
  const filteredMatches = useMemo(() => {
    return schedules.filter((m) => {
      const matchWeek = m.weekNumber || 1;
      if (selectedWeek !== "ALL" && matchWeek !== selectedWeek) return false;

      if (globalSearch.trim() !== "") {
        const q = globalSearch.toLowerCase();
        const matchTeamA = m.teamAName?.toLowerCase() || "";
        const matchTeamB = m.teamBName?.toLowerCase() || "";
        const matchRef = m.referee?.toLowerCase() || "";
        const matchStreamer = m.streamer?.toLowerCase() || "";
        const matchNum = m.id.toLowerCase();
        return (
          matchTeamA.includes(q) ||
          matchTeamB.includes(q) ||
          matchRef.includes(q) ||
          matchStreamer.includes(q) ||
          matchNum.includes(q)
        );
      }
      return true;
    });
  }, [schedules, selectedWeek, globalSearch]);

  const activeMatch = useMemo(() => {
    return schedules.find((m) => m.id === selectedMatchId);
  }, [schedules, selectedMatchId]);

  // Saringan chat log di dalam match
  const filteredChatLogs = useMemo(() => {
    if (!activeLogs) return [];
    if (!chatSearch.trim()) return activeLogs;
    const q = chatSearch.toLowerCase();
    return activeLogs.filter(
      (log) =>
        log.content?.toLowerCase().includes(q) ||
        log.authorName?.toLowerCase().includes(q) ||
        log.authorGlobalName?.toLowerCase().includes(q)
    );
  }, [activeLogs, chatSearch]);

  // Trigger Backup Sekarang
  const handleBackupNow = async () => {
    if (!activeMatch) return;
    const channelId = activeMatch.discordChannelId;
    if (!channelId) {
      Swal.fire({
        title: "Channel ID Tidak Ditemukan",
        text: "Match ini belum memiliki discordChannelId di database jadwal.",
        icon: "warning",
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
          channelId: channelId,
          week: activeMatch.weekNumber || 1,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setActiveLogs(json.logs);
        Swal.fire({
          title: "Backup Selesai!",
          text: `Berhasil mencadangkan ${json.count} pesan & bukti screenshot.`,
          icon: "success",
          confirmButtonColor: "#AA1348",
        });
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        title: "Gagal Backup",
        text: err.message || "Terjadi kesalahan sistem.",
        icon: "error",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
      <HeroHeader showDetails={false} />

      {/* HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-xl font-black tracking-tight">Match Discord Log Archive</h1>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Arsip riwayat percakapan duel dan bukti screenshot yang telah dicadangkan dari Discord.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border shadow-2xs bg-primary/10 text-primary border-primary/30 w-fit">
          <Database className="h-3 w-3" /> Mode Arsip Terproteksi
        </span>
      </div>

      {/* FILTER TAHAP 1: DI MUKA (WEEK & SEARCH METADATA) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-muted/20 border border-border p-3 rounded-2xl">
        <div className="sm:col-span-4 space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" /> Filter Pekan
          </label>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedWeek("ALL")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                selectedWeek === "ALL" ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
              }`}
            >
              Semua
            </button>
            {availableWeeks.map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  selectedWeek === w ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
                }`}
              >
                W{w}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-8 space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
            <Search className="h-3 w-3 text-primary" /> Cari Match / Tim / Wasit / Streamer
          </label>
          <div className="relative">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Ketik nama tim, nama wasit, atau ID match..."
              className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary pl-8"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* LIST KARTU MATCH */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-muted-foreground block">
          Pilih Match ({filteredMatches.length} Pertandingan):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredMatches.map((m) => {
            const isSelected = selectedMatchId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground mb-1">
                  <span>W{m.weekNumber || 1} • {m.id}</span>
                  {m.isFinished && (
                    <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Selesai
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs truncate">
                  {m.teamAName} <span className="text-muted-foreground font-normal">vs</span> {m.teamBName}
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1.5 pt-1 border-t border-border/40">
                  <span className="truncate">Wasit: {m.referee || "-"}</span>
                  <span className="truncate">Caster: {m.streamer || "-"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAMPILAN ARSIP LOG PERCAKAPAN */}
      {selectedMatchId && activeMatch && (
        <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col mt-4">
          {/* Top Bar Match Viewer */}
          <div className="border-b border-border bg-muted/40 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                <span>{activeMatch.teamAName} vs {activeMatch.teamBName}</span>
                <span className="text-[10px] font-mono font-normal bg-muted px-2 py-0.5 rounded-md">
                  {activeMatch.id}
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Wasit: <strong>{activeMatch.referee || "-"}</strong> • Streamer: <strong>{activeMatch.streamer || "-"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Pencarian Chat */}
              <div className="relative">
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Cari kata di chat..."
                  className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs w-36 sm:w-48 pl-7 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              {/* Tombol Backup Ulang */}
              <button
                onClick={handleBackupNow}
                disabled={isBackingUp}
                className="flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isBackingUp ? "animate-spin" : ""}`} />
                {isBackingUp ? "Mencadangkan..." : "Backup dari Discord"}
              </button>
            </div>
          </div>

          {/* Isi Balon Chat */}
          <div className="h-[480px] overflow-y-auto p-4 space-y-3 bg-background/50">
            {loadingChat ? (
              <div className="flex h-full items-center justify-center text-xs font-bold text-muted-foreground animate-pulse">
                ⏳ Mengambil riwayat obrolan dari KV...
              </div>
            ) : !activeLogs || activeLogs.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-center space-y-2 text-muted-foreground">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
                <p className="text-xs font-bold">Belum ada data backup log untuk match ini di KV.</p>
                <p className="text-[11px]">Klik tombol <strong>"Backup dari Discord"</strong> di atas untuk mengambil riwayat chat.</p>
              </div>
            ) : filteredChatLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Tidak ada pesan yang cocok dengan kata kunci "{chatSearch}".
              </div>
            ) : (
              filteredChatLogs.map((msg: any) => (
                <div key={msg.id} className="flex gap-2.5 text-xs leading-relaxed group hover:bg-muted/30 p-1.5 rounded-lg transition">
                  <img
                    src={msg.authorAvatar}
                    alt=""
                    className="h-7 w-7 rounded-full border border-border shrink-0 object-cover mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-foreground text-[11px] truncate">
                        {msg.authorGlobalName || msg.authorName}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        })} WIB
                      </span>
                    </div>

                    {msg.content && (
                      <p className="text-foreground/90 whitespace-pre-wrap break-words text-[11.5px]">
                        {msg.content}
                      </p>
                    )}

                    {/* Masked Image Proof */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewImage(att.maskedUrl)}
                            className="relative group/att max-w-xs cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/40 transition hover:border-primary/50"
                          >
                            <img
                              src={att.maskedUrl}
                              alt={att.fileName}
                              className="max-h-40 w-full object-contain rounded-lg"
                              onError={(e: any) => {
                                e.target.src = "/placeholder-proof.webp";
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity">
                              <span className="flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[9px] font-bold text-foreground">
                                <ImageIcon className="h-3 w-3" /> Perbesar Bukti
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL ZOOM BUKTI GAMBAR */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-card border border-border p-2">
            <img src={previewImage} alt="Bukti Duel" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <div className="mt-2 flex justify-between items-center px-2">
              <span className="text-[10px] text-muted-foreground font-medium">Klik di luar untuk menutup</span>
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
              >
                Buka Tab Baru <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
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
