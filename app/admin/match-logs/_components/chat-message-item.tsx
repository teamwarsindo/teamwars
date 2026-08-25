"use client";

import { useState } from "react";
import { formatDiscordTimeOnly, parseDiscordMarkdown } from "../_utils/discord-parser";
import { Image as ImageIcon, ExternalLink, Shield, Tv } from "lucide-react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";

export interface ChatLogMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorRoles?: string[];
  authorAvatar: string;
  content: string;
  timestamp: string;
  userMentions?: Record<string, any>;
  roleMentions?: Record<string, any>;
  attachments?: Array<{
    fileName: string;
    maskedUrl: string;
    contentType?: string;
  }>;
}

interface ChatMessageItemProps {
  msg: ChatLogMessage;
  match?: MatchScheduleItem;
  isHighlighted?: boolean;
}

export function ChatMessageItem({
  msg,
  match,
  isHighlighted = false,
}: ChatMessageItemProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const formattedHtml = parseDiscordMarkdown(msg.content, msg.userMentions, msg.roleMentions);

  // 1. Identifikasi Entitas / Peran Pengirim
  const isReferee = Boolean(
    (match?.refereeDiscordId && msg.authorId === match.refereeDiscordId) ||
    msg.authorGlobalName?.toLowerCase().includes("ghost") ||
    msg.authorName?.toLowerCase().includes("ghost")
  );

  const isStreamer = Boolean(
    (match?.streamerDiscordId && msg.authorId === match.streamerDiscordId) ||
    msg.authorGlobalName?.toLowerCase().includes("kaiser") ||
    msg.authorName?.toLowerCase().includes("kaiser")
  );

  const roleAId = (match as any)?.roleAId;
  const roleBId = (match as any)?.roleBId;
  const userRoles = msg.authorRoles || [];

  const isTeam1 = Boolean(roleAId && userRoles.includes(roleAId));
  const isTeam2 = Boolean(roleBId && userRoles.includes(roleBId));

  // 2. Skema Warna Tetap & Anti-Kontras (Light & Dark Friendly)
  let nameColorClass = "text-foreground";
  let avatarBorderClass = "border-border";
  let roleBadge = null;

  if (isReferee) {
    nameColorClass = "text-emerald-600 dark:text-emerald-400 font-black";
    avatarBorderClass = "border-emerald-500/50";
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <Shield className="h-2.5 w-2.5" /> Wasit
      </span>
    );
  } else if (isStreamer) {
    nameColorClass = "text-purple-600 dark:text-purple-400 font-black";
    avatarBorderClass = "border-purple-500/50";
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
        <Tv className="h-2.5 w-2.5" /> Streamer
      </span>
    );
  } else if (isTeam1) {
    nameColorClass = "text-sky-600 dark:text-sky-400 font-bold";
    avatarBorderClass = "border-sky-500/50";
    roleBadge = (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 max-w-[120px] truncate">
        {match?.teamAName || "Tim Kiri"}
      </span>
    );
  } else if (isTeam2) {
    nameColorClass = "text-amber-600 dark:text-amber-400 font-bold";
    avatarBorderClass = "border-amber-500/50";
    roleBadge = (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 max-w-[120px] truncate">
        {match?.teamBName || "Tim Kanan"}
      </span>
    );
  }

  return (
    <>
      <div
        className={`flex gap-2.5 text-xs leading-relaxed group p-2 rounded-xl transition ${
          isHighlighted
            ? "bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30"
            : "hover:bg-muted/40"
        }`}
      >
        {/* Avatar Author */}
        <img
          src={msg.authorAvatar}
          alt=""
          className={`h-8 w-8 rounded-full border shrink-0 object-cover mt-0.5 shadow-2xs ${avatarBorderClass}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
            {/* Nama Author & Badge Peran */}
            <span className={`text-[12px] truncate ${nameColorClass}`}>
              {msg.authorGlobalName || msg.authorName}
            </span>
            {roleBadge}
            <span className="text-[10px] text-muted-foreground/80 font-mono ml-auto">
              {formatDiscordTimeOnly(msg.timestamp)}
            </span>
          </div>

          {/* Isi Pesan Chat */}
          {msg.content && (
            <span
              className="text-foreground/90 whitespace-pre-wrap break-words text-[12px] leading-relaxed block space-y-1"
              dangerouslySetInnerHTML={{ __html: formattedHtml }}
            />
          )}

          {/* Bukti Gambar Attachment */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {msg.attachments.map((att, idx) => (
                <div
                  key={idx}
                  onClick={() => setPreviewImage(att.maskedUrl)}
                  className="relative group/att max-w-xs cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/40 transition hover:border-primary/50 shadow-xs"
                >
                  <img
                    src={att.maskedUrl}
                    alt={att.fileName}
                    className="max-h-44 w-full object-contain rounded-lg"
                    onError={(e: any) => {
                      e.target.src = "/placeholder-proof.webp";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground shadow-xs">
                      <ImageIcon className="h-3.5 w-3.5" /> Perbesar Bukti
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Zoom Preview Bukti */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-card border border-border p-2 shadow-2xl"
          >
            <img
              src={previewImage}
              alt="Bukti Duel"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
            <div className="mt-2 flex justify-between items-center px-2">
              <span className="text-[10px] text-muted-foreground font-medium">
                Klik di luar gambar untuk menutup
              </span>
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
    </>
  );
  }
            
