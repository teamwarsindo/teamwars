"use client";

import { useState, useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { ChatMessageItem, ChatLogMessage } from "./chat-message-item";
import { Search, RefreshCw, Trash2, Hash, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";

interface MatchChatCardProps {
  match: MatchScheduleItem;
  channelName?: string;
  logs: ChatLogMessage[] | null;
  loadingChat: boolean;
  isBackingUp: boolean;
  onBackup: () => void;
  onDeleteChannel: () => void;
}

export function MatchChatCard({
  match,
  channelName,
  logs,
  loadingChat,
  isBackingUp,
  onBackup,
  onDeleteChannel,
}: MatchChatCardProps) {
  const [chatSearch, setChatSearch] = useState("");

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!chatSearch.trim()) return logs;
    const q = chatSearch.toLowerCase();
    return logs.filter(
      (log) =>
        log.content?.toLowerCase().includes(q) ||
        log.authorName?.toLowerCase().includes(q) ||
        log.authorGlobalName?.toLowerCase().includes(q)
    );
  }, [logs, chatSearch]);

  const handleDeletePrompt = () => {
    Swal.fire({
      title: "Hapus Channel Discord?",
      text: `Channel ${channelName || match.id} akan dihapus permanen dari Discord. Pastikan sudah dicadangkan!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#4b5563",
      confirmButtonText: "Ya, Hapus Channel",
      cancelButtonText: "Batal",
      background: "#121212",
      color: "#ffffff",
    }).then((result) => {
      if (result.isConfirmed) {
        onDeleteChannel();
      }
    });
  };

  const displayChannelName = channelName || `⚔️-${match.id}`;

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col">
      {/* 🟢 TOP HEADER PRESISI GAYA KARTU JADWAL */}
      <div className="border-b border-border bg-muted/40 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Layout: [Logo A] Tim A vs [Logo B] Tim B */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <img
                src={match.teamALogo || "/placeholder-team.png"}
                alt=""
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border border-border object-cover bg-card"
                onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
              />
              <span className="font-black text-xs sm:text-sm text-foreground truncate max-w-[110px] sm:max-w-[150px]">
                {match.teamAName}
              </span>
            </div>

            <span className="text-[11px] font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
              VS
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <img
                src={match.teamBLogo || "/placeholder-team.png"}
                alt=""
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border border-border object-cover bg-card"
                onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
              />
              <span className="font-black text-xs sm:text-sm text-foreground truncate max-w-[110px] sm:max-w-[150px]">
                {match.teamBName}
              </span>
            </div>
          </div>

          {/* Badge Match ID 1 Baris Solid (whitespace-nowrap) */}
          <div className="shrink-0 flex items-center">
            <span className="whitespace-nowrap font-mono font-bold text-[10px] sm:text-[11px] bg-primary/10 text-primary border border-primary/25 px-2.5 py-1 rounded-lg">
              W{match.weekNumber || 1} • {match.id}
            </span>
          </div>
        </div>

        {/* Sub-info: Channel Discord Asli + Wasit + Streamer */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-muted-foreground font-medium pt-0.5 border-t border-border/40">
          <span className="flex items-center gap-1 font-mono text-primary font-bold">
            <Hash className="h-3 w-3" /> {displayChannelName}
          </span>
          <span>•</span>
          <span>Wasit: <strong className="text-foreground">{match.referee || "-"}</strong></span>
          <span>•</span>
          <span>Streamer: <strong className="text-foreground">{match.streamer || "-"}</strong></span>
        </div>

        {/* Action Bar: Search Chat Panjang + Backup + Trash */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Cari kata di dalam obrolan..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs pl-8 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <button
            onClick={onBackup}
            disabled={isBackingUp}
            className="flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground px-3.5 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer shrink-0 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isBackingUp ? "animate-spin" : ""}`} />
            <span>{isBackingUp ? "Proses..." : "Backup"}</span>
          </button>

          <button
            onClick={handleDeletePrompt}
            className="flex items-center justify-center h-8.5 w-8.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer shrink-0"
            title="Hapus Channel Discord"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body Percakapan */}
      <div className="h-[480px] overflow-y-auto p-4 space-y-3 bg-background/50">
        {loadingChat ? (
          <div className="flex h-full items-center justify-center text-xs font-bold text-muted-foreground animate-pulse">
            ⏳ Memuat riwayat pesan...
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-center space-y-2 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <p className="text-xs font-bold">Belum ada data backup untuk match ini.</p>
            <p className="text-[11px]">Klik tombol <strong>"Backup"</strong> di atas untuk mengambil obrolan.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Tidak ada obrolan yang cocok dengan kata "{chatSearch}".
          </div>
        ) : (
          filteredLogs.map((msg) => <ChatMessageItem key={msg.id} msg={msg} />)
        )}
      </div>
    </div>
  );
        }
