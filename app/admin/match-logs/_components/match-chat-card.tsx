"use client";

import { useState, useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { ChatMessageItem, ChatLogMessage } from "./chat-message-item";
import { Search, RefreshCw, ShieldAlert } from "lucide-react";

interface MatchChatCardProps {
  match: MatchScheduleItem;
  logs: ChatLogMessage[] | null;
  loadingChat: boolean;
  isBackingUp: boolean;
  onBackup: () => void;
}

export function MatchChatCard({
  match,
  logs,
  loadingChat,
  isBackingUp,
  onBackup,
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

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col">
      {/* Top Header Card */}
      <div className="border-b border-border bg-muted/40 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
            <span>{match.teamAName} vs {match.teamBName}</span>
            <span className="text-[10px] font-mono font-normal bg-muted border border-border px-2 py-0.5 rounded-md">
              W{match.weekNumber || 1} • {match.id}
            </span>
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Wasit: <strong>{match.referee || "-"}</strong> • Streamer: <strong>{match.streamer || "-"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            onClick={onBackup}
            disabled={isBackingUp}
            className="flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3 w-3 ${isBackingUp ? "animate-spin" : ""}`} />
            {isBackingUp ? "Mencadangkan..." : "Backup Discord"}
          </button>
        </div>
      </div>

      {/* Body Balon Chat */}
      <div className="h-[480px] overflow-y-auto p-4 space-y-3 bg-background/50">
        {loadingChat ? (
          <div className="flex h-full items-center justify-center text-xs font-bold text-muted-foreground animate-pulse">
            ⏳ Memuat riwayat pesan...
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-center space-y-2 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <p className="text-xs font-bold">Belum ada data backup untuk match ini.</p>
            <p className="text-[11px]">Klik tombol <strong>"Backup Discord"</strong> di atas untuk mengambil obrolan.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Tidak ada obrolan yang cocok dengan kata "{chatSearch}".
          </div>
        ) : (
          filteredLogs.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              matchContext={{
                teamAName: match.teamAName,
                teamBName: match.teamBName,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
        }
