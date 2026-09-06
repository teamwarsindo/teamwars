"use client";

import { useState, useMemo, Fragment } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { ChatMessageItem, ChatLogMessage } from "./chat-message-item";
import { formatDiscordDateHeader } from "../_utils/discord-parser";
import { Search, RefreshCw, Trash2, ShieldAlert, Shield, Tv, Bot } from "lucide-react";
import Swal from "sweetalert2";

interface MatchChatCardProps {
  match: MatchScheduleItem;
  logs: ChatLogMessage[] | null;
  loadingChat: boolean;
  isBackingUp: boolean;
  playerTeamMap?: Record<string, string>;
  onBackup: (includeBots: boolean) => void;
  onDeleteChannel: () => void;
}

export function MatchChatCard({
  match,
  logs,
  loadingChat,
  isBackingUp,
  playerTeamMap = {},
  onBackup,
  onDeleteChannel,
}: MatchChatCardProps) {
  const [chatSearch, setChatSearch] = useState("");
  const [includeBots, setIncludeBots] = useState(false);

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
      text: `Channel ${match.id} akan dihapus permanen dari server Discord dan role akses wasit akan dicabut. Pastikan sudah dicadangkan!`,
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

  const scoreA = (match as any)?.scoreA ?? (match as any)?.teamAScore ?? "-";
  const scoreB = (match as any)?.scoreB ?? (match as any)?.teamBScore ?? "-";
  const scoreDisplay = `${scoreA} - ${scoreB}`;

  return (
    <div className="h-full flex-1 min-h-0 rounded-2xl border border-border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col">
      {/* HEADER CARD */}
      <div className="shrink-0 border-b border-border bg-card p-2.5 sm:p-3 space-y-2 shadow-xs">
        
        {/* BARIS 1: NAMA TIM & SKOR */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* Tim A */}
          <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
            <span className="text-[11px] sm:text-xs font-semibold text-sky-600 dark:text-sky-400 truncate leading-tight">
              {match.teamAName}
            </span>
            <img
              src={match.teamALogo || "/placeholder-team.png"}
              alt=""
              className="h-5 w-5 rounded-full border border-sky-500/40 object-cover shrink-0"
              onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
            />
          </div>

          {/* Skor */}
          <div className="shrink-0">
            <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-muted text-foreground border border-border shadow-2xs">
              {scoreDisplay}
            </span>
          </div>

          {/* Tim B */}
          <div className="flex items-center justify-start gap-1.5 min-w-0 flex-1 text-left">
            <img
              src={match.teamBLogo || "/placeholder-team.png"}
              alt=""
              className="h-5 w-5 rounded-full border border-amber-500/40 object-cover shrink-0"
              onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
            />
            <span className="text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 truncate leading-tight">
              {match.teamBName}
            </span>
          </div>
        </div>

        {/* BARIS 2: WASIT & STREAMER (LEGA) */}
        <div className="flex items-center text-[11px] border-t border-border/40 pt-1.5 text-muted-foreground gap-4">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="truncate">
              Wasit: <strong className="text-emerald-600 dark:text-emerald-400 font-medium">{match.referee || "-"}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Tv className="h-3 w-3 text-purple-500 shrink-0" />
            <span className="truncate">
              Streamer: <strong className="text-purple-600 dark:text-purple-400 font-medium">{match.streamer || "-"}</strong>
            </span>
          </div>
        </div>

        {/* BARIS 3: CARI KATA + TOGGLE BOT + BUTTONS */}
        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap sm:flex-nowrap">
          {/* Kolom Cari Kata di Obrolan */}
          <div className="relative flex-1 min-w-[140px]">
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Cari kata di obrolan..."
              className="w-full bg-muted/40 border border-border rounded-lg h-8 px-2.5 pl-7 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {!isChannelDeleted && (
            <>
              {/* Tombol Toggle Pesan Bot TWI */}
              <button
                type="button"
                onClick={() => setIncludeBots((prev) => !prev)}
                className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 border ${
                  includeBots
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
                title={includeBots ? "Pesan Bot TWI diikutkan saat backup" : "Pesan Bot TWI diabaikan saat backup"}
              >
                <Bot className={`h-3.5 w-3.5 ${includeBots ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <span className="hidden sm:inline">Pesan Bot TWI</span>
                <span className="sm:hidden">Bot TWI</span>
              </button>

              {/* Tombol Backup */}
              <button
                onClick={() => onBackup(includeBots)}
                disabled={isBackingUp}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition cursor-pointer shrink-0 disabled:opacity-50"
                title="Backup pesan ke database"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isBackingUp ? "animate-spin" : ""}`} />
                <span>{isBackingUp ? "Proses..." : "Backup"}</span>
              </button>

              {/* Tombol Hapus Channel */}
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

      {/* BODY CHAT SCROLLABLE */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-background/50 overscroll-contain">
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
