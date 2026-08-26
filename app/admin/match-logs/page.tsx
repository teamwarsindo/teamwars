"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { MatchChatCard } from "./_components/match-chat-card";
import { Search, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function MatchLogsAdminPage() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchSchedule, setSearchSchedule] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

  const [chatLogs, setChatLogs] = useState<any[] | null>(null);
  const [channelName, setChannelName] = useState<string>("");
  const [playerTeamMap, setPlayerTeamMap] = useState<Record<string, any>>({});
  const [loadingChat, setLoadingChat] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // 1. Fetch schedules (TIDAK auto-select match 1)
  useEffect(() => {
    async function loadSchedules() {
      try {
        setLoadingList(true);
        const res = await fetch("/api/admin/match-logs");
        const data = await res.json();
        if (data.schedules) {
          setSchedules(data.schedules);
        }
      } catch (err) {
        console.error("Gagal memuat jadwal:", err);
      } finally {
        setLoadingList(false);
      }
    }
    loadSchedules();
  }, []);

  // 2. Fetch log detail HANYA saat user memilih match
  useEffect(() => {
    if (!selectedMatchId) {
      setChatLogs(null);
      return;
    }

    async function loadLogs() {
      try {
        setLoadingChat(true);
        const res = await fetch(`/api/admin/match-logs?matchId=${selectedMatchId}`);
        const data = await res.json();
        setChatLogs(data.logs || []);
        setChannelName(data.channelName || "");
        setPlayerTeamMap(data.playerTeamMap || {});
      } catch (err) {
        console.error("Gagal memuat log match:", err);
        setChatLogs([]);
      } finally {
        setLoadingChat(false);
      }
    }
    loadLogs();
  }, [selectedMatchId]);

  const handleBackup = async () => {
    const currentMatch = schedules.find((m) => m.id === selectedMatchId);
    if (!currentMatch?.discordChannelId) {
      Swal.fire("Info", "Channel Discord sudah tidak aktif / terhapus.", "info");
      return;
    }

    try {
      setIsBackingUp(true);
      const res = await fetch("/api/admin/match-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatchId,
          channelId: currentMatch.discordChannelId,
          week: currentMatch.weekNumber || 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatLogs(data.logs);
        setChannelName(data.channelName);
        Swal.fire("Berhasil", data.message || "Log berhasil dicadangkan!", "success");
      } else {
        Swal.fire("Gagal", data.error || "Gagal mencadangkan log.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Terjadi kesalahan sistem.", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteChannel = async () => {
    const currentMatch = schedules.find((m) => m.id === selectedMatchId);
    if (!currentMatch?.discordChannelId) return;

    try {
      const res = await fetch("/api/admin/match-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatchId,
          channelId: currentMatch.discordChannelId,
          refereeDiscordId: currentMatch.refereeDiscordId,
          roleAId: (currentMatch as any).roleAId,
          roleBId: (currentMatch as any).roleBId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((m) =>
            m.id === selectedMatchId ? { ...m, discordChannelId: undefined, discordLogsSaved: true } : m
          )
        );
        Swal.fire("Terhapus", "Channel Discord berhasil dibersihkan.", "success");
      } else {
        Swal.fire("Gagal", data.error || "Gagal menghapus channel.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal menghapus channel.", "error");
    }
  };

  const filteredSchedules = schedules.filter((m) => {
    const q = searchSchedule.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      m.teamAName.toLowerCase().includes(q) ||
      m.teamBName.toLowerCase().includes(q) ||
      (m.referee && m.referee.toLowerCase().includes(q)) ||
      (m.streamer && m.streamer.toLowerCase().includes(q))
    );
  });

  const selectedMatch = schedules.find((m) => m.id === selectedMatchId);

  return (
    <div className="space-y-4">
      {/* 1. Global Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchSchedule}
          onChange={(e) => setSearchSchedule(e.target.value)}
          placeholder="Ketik nama tim, wasit, streamer, atau ID match"
          className="w-full bg-card border border-border rounded-2xl px-4 py-2.5 text-xs sm:text-sm pl-10 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
        />
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
      </div>

      {/* 2. Daftar Hasil Pencarian (Hanya muncul jika user mengetik) */}
      {searchSchedule.trim() !== "" && (
        <div className="bg-card border border-border rounded-2xl p-2 max-h-60 overflow-y-auto space-y-1 shadow-sm">
          {filteredSchedules.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Tidak ada pertandingan yang cocok.
            </div>
          ) : (
            filteredSchedules.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMatchId(m.id);
                  setSearchSchedule("");
                }}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  selectedMatchId === m.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span>
                  W{m.weekNumber || 1} • {m.teamAName} vs {m.teamBName}
                </span>
                <span className="font-mono text-[10px] opacity-80">{m.id}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* 3. Tampilan Chat Match yang Dipilih */}
      {loadingList ? (
        <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Memuat data...
        </div>
      ) : selectedMatch ? (
        <MatchChatCard
          match={selectedMatch}
          channelName={channelName}
          logs={chatLogs}
          loadingChat={loadingChat}
          isBackingUp={isBackingUp}
          playerTeamMap={playerTeamMap}
          onBackup={handleBackup}
          onDeleteChannel={handleDeleteChannel}
        />
      ) : (
        !searchSchedule && (
          <div className="text-center p-8 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
            Ketik nama tim atau ID match di kolom pencarian untuk melihat obrolan.
          </div>
        )
      )}

      {/* 4. Footer Tetap Muncul */}
      <footer className="text-center py-6 text-[11px] text-muted-foreground">
        © 2026 Team Wars Indonesia. All rights reserved.
      </footer>
    </div>
  );
         }
          
