"use client";

import { useState, useMemo, Fragment } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { ChatMessageItem, ChatLogMessage } from "./chat-message-item";
import { formatDiscordDateHeader } from "../_utils/discord-parser";
import { Search, RefreshCw, Trash2, Hash, ShieldAlert, Shield, Tv } from "lucide-react";
import Swal from "sweetalert2";

interface MatchChatCardProps {
  match: MatchScheduleItem;
  channelName?: string;
  logs: ChatLogMessage[] | null;
  loadingChat: boolean;
  isBackingUp: boolean;
  playerTeamMap?: Record<string, string>;
  onBackup: () => void;
  onDeleteChannel: () => void;
}

export function MatchChatCard({
  match,
  channelName,
  logs,
  loadingChat,
  isBackingUp,
  playerTeamMap = {},
  onBackup,
  onDeleteChannel,
}: MatchChatCardProps) {
  const [chatSearch, setChatSearch] = useState("");

  const isChannelDeleted = !match.discordChannelId;

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
    if (isChannelDeleted) return;

    Swal.fire({
      title: "Hapus Channel Discord?",
      text: `Channel ${channelName || match.id} akan dihapus permanen dari server Discord dan role akses wasit akan dicabut. Pastikan sudah dicadangkan!`,
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
      {/* TOP HEADER CARD */}
      <div className="border-b border-border bg-muted/40 p-4 space-y-3.5">
        
        {/* 1. Judul Tim Center */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <img
              src={match.teamALogo || "/placeholder-team.png"}
              alt=""
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-sky-500/50 object-cover bg-card shadow-xs"
              onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
            />
            <span className="font-semibold text-sm sm:text-base text-sky-600 dark:text-sky-400 tracking-tight">
              {match.teamAName}
            </span>
          </div>

          <span className="text-xs font-semibold text-muted-foreground uppercase px-1">
            VS
          </span>

          <div className="flex items-center gap-2">
            <img
              src={match.teamBLogo || "/placeholder-team.png"}
              alt=""
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-amber-500/50 object-cover bg-card shadow-xs"
              onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
            />
            <span className="font-semibold text-sm sm:text-base text-amber-600 dark:text-amber-400 tracking-tight">
              {match.teamBName}
            </span>
          </div>
        </div>

        {/* 2. Kapsul Match ID & Channel */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold bg-primary/10 text-primary border border-primary/25 shadow-2xs">
            W{match.weekNumber || 1} • {match.id}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold bg-muted text-foreground border border-border shadow-2xs">
            <Hash className="h-3.5 w-3.5 text-primary" /> {displayChannelName}
          </span>
        </div>

        {/* 3. Info Wasit & Streamer */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground font-medium pt-1 border-t border-border/40">
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3 w-3 text-emerald-500" />
            Wasit: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{match.referee || "-"}</strong>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Tv className="h-3 w-3 text-purple-500" />
            Streamer: <strong className="text-purple-600 dark:text-purple-400 font-semibold">{match.streamer || "-"}</strong>
          </span>
        </div>

        {/* 4. Action Bar (Search Bar Otomatis Full Lebar jika Channel Dihapus) */}
        <div className="flex items-center gap-2 pt-1.5">
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

          {/* Tombol Aksi: Auto-hide jika channel sudah dihapus */}
          {!isChannelDeleted && (
            <>
              <button
                onClick={onBackup}
                disabled={isBackingUp}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shrink-0 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                title="Backup pesan ke database"
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
            </>
          )}
        </div>
      </div>

      {/* Body Percakapan */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-3.5 bg-background/50">
        {loadingChat ? (
          <div className="flex h-full items-center justify-center text-xs font-semibold text-muted-foreground animate-pulse">
            ⏳ Memuat riwayat pesan...
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-center space-y-2 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <p className="text-xs font-semibold">Belum ada data backup untuk match ini.</p>
            <p className="text-[11px]">
              {isChannelDeleted
                ? "Channel Discord sudah dibersihkan tanpa pencadangan sebelumnya."
                : 'Klik tombol "Backup" di atas untuk mengambil obrolan.'}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Tidak ada obrolan yang cocok dengan kata &quot;{chatSearch}&quot;.
          </div>
        ) : (
          filteredLogs.map((msg, idx) => {
            const currentDateHeader = formatDiscordDateHeader(msg.timestamp);
            const prevMsg = idx > 0 ? filteredLogs[idx - 1] : null;
            const prevDateHeader = prevMsg ? formatDiscordDateHeader(prevMsg.timestamp) : null;
            const isNewDay = currentDateHeader !== prevDateHeader;

            const isMatchSearch =
              chatSearch.trim() !== "" &&
              msg.content?.toLowerCase().includes(chatSearch.toLowerCase());

            return (
              <Fragment key={msg.id}>
                {isNewDay && (
                  <div className="relative flex items-center justify-center my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/60" />
                    </div>
                    <span className="relative bg-card border border-border px-3 py-0.5 rounded-full text-[10px] font-semibold text-muted-foreground shadow-2xs">
                      {currentDateHeader}
                    </span>
                  </div>
                )}
                <ChatMessageItem
                  msg={msg}
                  match={match}
                  playerTeamMap={playerTeamMap}
                  isHighlighted={isMatchSearch}
                />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
