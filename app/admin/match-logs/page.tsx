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

  useEffect(() => {
    async function loadSchedules() {
      try {
        setLoadingList(true);
        const res = await fetch("/api/admin/match-logs");
        const data = await res.json();
        if (data.schedules) {
          setSchedules(data.schedules);
          if (data.schedules.length > 0 && !selectedMatchId) {
            setSelectedMatchId(data.schedules[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat daftar match:", err);
      } finally {
        setLoadingList(false);
      }
    }
    loadSchedules();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;

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
    <div className="container max-w-2xl mx-auto px-3 py-3 sm:py-4 space-y-3 pb-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchSchedule}
          onChange={(e) => setSearchSchedule(e.target.value)}
          placeholder="Ketik nama tim, wasit, streamer, atau ID match"
          className="w-full h-10 pl-10 pr-4 rounded-2xl bg-card border border-border text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
        />
      </div>

      {searchSchedule.trim() !== "" && filteredSchedules.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filteredSchedules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMatchId(m.id);
                setSearchSchedule("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                selectedMatchId === m.id
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card hover:bg-muted text-muted-foreground border-border"
              }`}
            >
              W{m.weekNumber || 1} · {m.teamAName} vs {m.teamBName}
            </button>
          ))}
        </div>
      )}

      {loadingList ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-semibold">Memuat data arsip pertandingan...</span>
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
        <div className="text-center p-8 border border-border rounded-2xl bg-card text-xs text-muted-foreground">
          Tidak ada pertandingan yang dipilih atau cocok dengan pencarian.
        </div>
      )}
    </div>
  );
}