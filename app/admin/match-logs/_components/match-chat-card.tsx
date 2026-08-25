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
      {/* TOP HEADER CARD (DIRAMPINGKAN) */}
      <div className="border-b border-border bg-muted/30 p-3 space-y-2">
        
        {/* 1. Tim Versus & Badge Match Info */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Nama Tim A vs Tim B */}
          <div className="flex items-center gap-1.5 min-w-0 text-xs font-semibold">
            <img
              src={match.teamALogo || "/placeholder-team.png"}
              alt=""
              className="h-5 w-5 rounded-full border border-sky-500/40 object-cover shrink-0"
              onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
            />
            <span className="text-sky-600 dark:text-sky-400 truncate max-w-[90px] sm:max-w-[140px]">
              {match.teamAName}
            </span>
            
            <span className="text-[10px] text-muted-foreground font-normal shrink-0 px-0.5">vs</span>

            <img
              src={match.teamBLogo || "/placeholder-team.png"}
              alt=""
              className="h-5 w-5 rounded-full border border-amber-500/40 object-cover shrink-0"
              onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
            />
            <span className="text-amber-600 dark:text-amber-400 truncate max-w-[90px] sm:max-w-[140px]">
              {match.teamBName}
            </span>
          </div>

          {/* Badges W2 & Channel Name */}
          <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
            <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold border border-primary/20">
              W{match.weekNumber || 1} · {match.id}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium hidden sm:inline-flex items-center gap-0.5 border border-border">
              <Hash className="h-2.5 w-2.5" /> {displayChannelName}
            </span>
          </div>
        </div>

        {/* 2. Petugas: Wasit & Streamer */}
        <div className="flex items-center justify-between text-[11px] border-t border-border/40 pt-1.5 text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-500" />
              Wasit: <strong className="text-emerald-600 dark:text-emerald-400 font-medium">{match.referee || "-"}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <Tv className="h-3 w-3 text-purple-500" />
              Streamer: <strong className="text-purple-600 dark:text-purple-400 font-medium">{match.streamer || "-"}</strong>
            </span>
          </div>
        </div>

        {/* 3. Action Bar: Search Input + Backup & Delete Buttons */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Cari kata di obrolan..."
              className="w-full bg-background border border-border rounded-lg h-8 px-2.5 pl-7 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {!isChannelDeleted && (
            <>
              <button
                onClick={onBackup}
                disabled={isBackingUp}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition cursor-pointer shrink-0 disabled:opacity-50"
                title="Backup pesan ke database"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isBackingUp ? "animate-spin" : ""}`} />
                <span>{isBackingUp ? "Proses..." : "Backup"}</span>
              </button>

              <button
                onClick={handleDeletePrompt}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer shrink-0"
                title="Hapus Channel Discord"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body Percakapan */}
      <div className="h-[520px] overflow-y-auto p-3 sm:p-4 space-y-3 bg-background/50">
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
                  <div className="relative flex items-center justify-center my-2.5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/60" />
                    </div>
                    <span className="relative bg-card border border-border px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-muted-foreground shadow-2xs">
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
