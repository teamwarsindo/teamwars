"use client";

import { useState } from "react";
import { formatDiscordTimeOnly, parseDiscordMarkdown } from "../_utils/discord-parser";
import { Image as ImageIcon, ExternalLink } from "lucide-react";

export interface ChatLogMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorAvatar: string;
  authorColor?: string;
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

export function ChatMessageItem({
  msg,
  isHighlighted = false,
}: {
  msg: ChatLogMessage;
  isHighlighted?: boolean;
}) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const formattedHtml = parseDiscordMarkdown(msg.content, msg.userMentions, msg.roleMentions);

  // Pewarnaan adaptif nama user Discord
  const isColorValid =
    msg.authorColor &&
    msg.authorColor !== "#000000" &&
    msg.authorColor.toLowerCase() !== "#ffffff";

  return (
    <>
      <div
        className={`flex gap-2.5 text-xs leading-relaxed group p-2 rounded-xl transition ${
          isHighlighted
            ? "bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30"
            : "hover:bg-muted/40"
        }`}
      >
        <img
          src={msg.authorAvatar}
          alt=""
          className="h-8 w-8 rounded-full border border-border shrink-0 object-cover mt-0.5 shadow-2xs"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
            <span
              className="font-bold text-[12px] truncate"
              style={isColorValid ? { color: msg.authorColor } : undefined}
            >
              {msg.authorGlobalName || msg.authorName}
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-mono">
              {formatDiscordTimeOnly(msg.timestamp)}
            </span>
          </div>

          {msg.content && (
            <span
              className="text-foreground/90 whitespace-pre-wrap break-words text-[12px] leading-relaxed block space-y-1"
              dangerouslySetInnerHTML={{ __html: formattedHtml }}
            />
          )}

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

      {/* Modal Zoom Preview */}
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
    </>
  );
}
