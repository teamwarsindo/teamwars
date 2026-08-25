"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import {
  MessageSquare,
  Search,
  ShieldAlert,
  Database,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  X,
  ChevronRight,
  Shield,
  Radio,
} from "lucide-react";
import Swal from "sweetalert2";

function MatchLogViewerContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  // Saringan instan saat user mengetik di search bar
  const matchedResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase().trim();
    return schedules
      .filter((m) => {
        const teamA = m.teamAName?.toLowerCase() || "";
        const teamB = m.teamBName?.toLowerCase() || "";
        const ref = m.referee?.toLowerCase() || "";
        const streamer = m.streamer?.toLowerCase() || "";
        const matchId = m.id.toLowerCase();
        const week = `w${m.weekNumber || 1}`;
        return (
          teamA.includes(q) ||
          teamB.includes(q) ||
          ref.includes(q) ||
          streamer.includes(q) ||
          matchId.includes(q) ||
          week === q
        );
      })
      .slice(0, 8); // Batasi 8 saran terbaik agar rapi
  }, [schedules, globalSearch]);

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

  // Trigger Backup
  const handleBackupNow = async () => {
    if (!activeMatch) return;
    const channelId = activeMatch.discordChannelId;
    if (!channelId) {
      Swal.fire({
        title: "Channel Belum Terhubung",
        text: "Match ini belum memiliki Discord Channel ID di jadwal KV.",
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
        text: err.message || "Terjadi kendala server.",
        icon: "error",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
      <HeroHeader showDetails={false} />

      {/* HEADER UTAMA */}
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

      {/* SEARCH BAR TUNGGAL (INSTANT SEARCH) */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={globalSearch}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setIsSearchFocused(true);
            }}
            placeholder="Ketik nama tim (misal: FPF, Dino), nama wasit, atau ID match..."
            className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-sm focus:outline-hidden pl-10 pr-10 transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          {globalSearch && (
            <button
              onClick={() => {
                setGlobalSearch("");
                setIsSearchFocused(false);
              }}
              className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* DROPDOWN HASIL MATCH SAAT MENGETIK */}
        {isSearchFocused && globalSearch.trim() !== "" && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-border/60 max-h-80 overflow-y-auto">
            {matchedResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground font-medium">
                Tidak ada match yang cocok dengan "{globalSearch}"
              </div>
            ) : (
              matchedResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMatchId(m.id);
                    setIsSearchFocused(false);
                  }}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/60 transition group cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mb-0.5">
                      <span className="font-bold text-primary">W{m.weekNumber || 1}</span>
                      <span>•</span>
                      <span>{m.id}</span>
                      {m.isFinished && (
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Selesai
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {m.teamAName} <span className="text-muted-foreground font-normal">vs</span> {m.teamBName}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> {m.referee || "-"}</span>
                      <span className="flex items-center gap-1"><Radio className="h-2.5 w-2.5" /> {m.streamer || "-"}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* TAMPILAN ARSIP LOG PERCAKAPAN */}
      {selectedMatchId && activeMatch ? (
        <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col">
          {/* Top Bar Match Viewer */}
          <div className="border-b border-border bg-muted/40 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                <span>{activeMatch.teamAName} vs {activeMatch.teamBName}</span>
                <span className="text-[10px] font-mono font-normal bg-muted border border-border px-2 py-0.5 rounded-md">
                  W{activeMatch.weekNumber || 1} • {activeMatch.id}
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Wasit: <strong>{activeMatch.referee || "-"}</strong> • Streamer: <strong>{activeMatch.streamer || "-"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Pencarian Isi Chat */}
              <div className="relative">
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Cari teks di chat..."
                  className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs w-36 sm:w-44 pl-7 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              {/* Tombol Backup Ulang */}
              <button
                onClick={handleBackupNow}
                disabled={isBackingUp}
                className="flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`h-3 w-3 ${isBackingUp ? "animate-spin" : ""}`} />
                {isBackingUp ? "Mencadangkan..." : "Backup Discord"}
              </button>
            </div>
          </div>

          {/* Isi Balon Chat Kronologis */}
          <div className="h-[480px] overflow-y-auto p-4 space-y-3 bg-background/50">
            {loadingChat ? (
              <div className="flex h-full items-center justify-center text-xs font-bold text-muted-foreground animate-pulse">
                ⏳ Memuat riwayat pesan...
              </div>
            ) : !activeLogs || activeLogs.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-center space-y-2 text-muted-foreground">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
                <p className="text-xs font-bold">Belum ada data backup untuk match ini.</p>
                <p className="text-[11px]">Klik tombol <strong>"Backup Discord"</strong> di atas untuk mengambil obrolan.</p>
              </div>
            ) : filteredChatLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Tidak ada obrolan yang cocok dengan kata "{chatSearch}".
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

                    {/* Masked Screenshot Bukti */}
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
      ) : (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl p-6 text-muted-foreground space-y-1">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-xs font-bold text-foreground">Pilih Pertandingan</p>
          <p className="text-[11px]">Ketik nama tim atau wasit di kolom pencarian di atas untuk membuka log.</p>
        </div>
      )}

      {/* MODAL ZOOM GAMBAR BUKTI */}
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
