"use client";

import { useState, useEffect } from "react";
import { formatDiscordTimeOnly, parseDiscordMarkdown } from "../_utils/discord-parser";
import { Image as ImageIcon, ExternalLink, Shield, Tv, ShieldAlert, Forward, MessageSquareOff } from "lucide-react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";

export interface ChatLogMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  userMentions?: Record<string, any>;
  roleMentions?: Record<string, any>;
  channelMentions?: Record<string, any>;
  replyTo?: {
    id: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    hasAttachment?: boolean;
    isDeleted?: boolean;
  };
  forwarded?: {
    content?: string;
    attachments: Array<{
      fileName: string;
      maskedUrl: string;
      contentType?: string;
    }>;
  };
  attachments?: Array<{
    fileName: string;
    maskedUrl: string;
    contentType?: string;
  }>;
}

interface ChatMessageItemProps {
  msg: ChatLogMessage;
  match?: MatchScheduleItem;
  playerTeamMap?: Record<string, any>;
  isHighlighted?: boolean;
}

export function ChatMessageItem({
  msg,
  match,
  playerTeamMap = {},
  isHighlighted = false,
}: ChatMessageItemProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewImage]);

  const name1 = (msg.authorGlobalName || "").trim();
  const name2 = (msg.authorName || "").trim();
  const n1Lower = name1.toLowerCase();
  const n2Lower = name2.toLowerCase();
  const authorId = msg.authorId || "";

  const matchReferee = (match?.referee || "").trim().toLowerCase();
  const isReferee = Boolean(
    (match?.refereeDiscordId && authorId === match.refereeDiscordId) ||
    (matchReferee && matchReferee !== "-" && (n1Lower.includes(matchReferee) || n2Lower.includes(matchReferee) || matchReferee.includes(n1Lower) || matchReferee.includes(n2Lower)))
  );

  const matchStreamer = (match?.streamer || "").trim().toLowerCase();
  const isStreamer = Boolean(
    (match?.streamerDiscordId && authorId === match.streamerDiscordId) ||
    (matchStreamer && matchStreamer !== "-" && (n1Lower.includes(matchStreamer) || n2Lower.includes(matchStreamer) || matchStreamer.includes(n1Lower) || matchStreamer.includes(n2Lower)))
  );

  const teamASlug = (match?.teamAId || (match as any)?.teamACode || match?.teamAName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const teamBSlug = (match?.teamBId || (match as any)?.teamBCode || match?.teamBName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

  const cleanTeamAName = (match?.teamAName || "").toLowerCase();
  const cleanTeamBName = (match?.teamBName || "").toLowerCase();

  const checkAffiliation = (uName: string): string => {
    if (!uName) return "";
    const cleanKey = uName.trim().toLowerCase();
    const target =
      playerTeamMap[cleanKey] ||
      Object.entries(playerTeamMap).find(([ign]) => ign.toLowerCase() === cleanKey)?.[1];

    if (!target) return "";
    if (typeof target === "string") return target.toLowerCase();
    return (target.teamSlug || "").toLowerCase();
  };

  let isTeam1 = false;
  let isTeam2 = false;

  if (!isReferee && !isStreamer) {
    const userTeamSlug = checkAffiliation(name1) || checkAffiliation(name2) || checkAffiliation(authorId);

    isTeam1 = Boolean(
      userTeamSlug &&
      (userTeamSlug === teamASlug || teamASlug.includes(userTeamSlug) || (cleanTeamAName && cleanTeamAName.includes(userTeamSlug.replace(/-/g, " "))))
    );

    isTeam2 = Boolean(
      userTeamSlug &&
      (userTeamSlug === teamBSlug || teamBSlug.includes(userTeamSlug) || (cleanTeamBName && cleanTeamBName.includes(userTeamSlug.replace(/-/g, " "))))
    );
  }

  let nameColorClass = "text-rose-600 dark:text-rose-400 font-semibold";
  let avatarBorderClass = "border-rose-500/50";
  let roleIcon = (
    <span title="Admin / Panitia" className="inline-flex items-center text-rose-500 dark:text-rose-400">
      <ShieldAlert className="h-3.5 w-3.5 fill-rose-500/20" />
    </span>
  );

  if (isReferee) {
    nameColorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
    avatarBorderClass = "border-emerald-500";
    roleIcon = (
      <span title="Wasit" className="inline-flex items-center text-emerald-500 dark:text-emerald-400">
        <Shield className="h-3.5 w-3.5 fill-emerald-500/20" />
      </span>
    );
  } else if (isStreamer) {
    nameColorClass = "text-purple-600 dark:text-purple-400 font-semibold";
    avatarBorderClass = "border-purple-500";
    roleIcon = (
      <span title="Streamer" className="inline-flex items-center text-purple-500 dark:text-purple-400">
        <Tv className="h-3.5 w-3.5" />
      </span>
    );
  } else if (isTeam1) {
    nameColorClass = "text-sky-600 dark:text-sky-400 font-semibold";
    avatarBorderClass = "border-sky-500";
    roleIcon = (
      <img
        src={match?.teamALogo || "/placeholder-team.png"}
        alt=""
        className="h-4 w-4 rounded-full border border-sky-500/40 object-cover inline-block shadow-2xs"
        onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
      />
    );
  } else if (isTeam2) {
    nameColorClass = "text-amber-600 dark:text-amber-400 font-semibold";
    avatarBorderClass = "border-amber-500";
    roleIcon = (
      <img
        src={match?.teamBLogo || "/placeholder-team.png"}
        alt=""
        className="h-4 w-4 rounded-full border border-amber-500/40 object-cover inline-block shadow-2xs"
        onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
      />
    );
  }

  return (
    <>
      <div
        className={`relative flex flex-col text-xs leading-relaxed group p-2 rounded-xl transition ${
          isHighlighted
            ? "bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30"
            : "hover:bg-muted/40"
        }`}
      >
        {/* SIKU REPLY DENGAN PARSER EMOJI / MARKDOWN LENGKAP */}
        {msg.replyTo && (
          <div className="relative flex items-center gap-1.5 pl-12 pr-2 pb-1 text-[11px] text-muted-foreground font-medium min-w-0">
            <div className="absolute left-6 top-2 h-3.5 w-5 border-l-2 border-t-2 border-muted-foreground/40 rounded-tl-md pointer-events-none" />

            {msg.replyTo.isDeleted ? (
              <span className="inline-flex items-center gap-1 italic text-muted-foreground/70 truncate">
                <MessageSquareOff className="h-3 w-3 shrink-0" /> Original message was deleted
              </span>
            ) : (
              <>
                {msg.replyTo.authorAvatar ? (
                  <img
                    src={msg.replyTo.authorAvatar}
                    alt=""
                    className="h-3.5 w-3.5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full bg-muted shrink-0 inline-block" />
                )}
                
                <span className="font-semibold text-foreground/80 shrink-0">
                  @{msg.replyTo.authorName}
                </span>

                {/* Render Teks Reply melalui Markdown & Emoji Parser */}
                <div
                  className="italic text-muted-foreground/75 truncate min-w-0 flex-1 flex items-center gap-1"
                  dangerouslySetInnerHTML={{
                    __html: msg.replyTo.content
                      ? parseDiscordMarkdown(
                          msg.replyTo.content,
                          msg.userMentions,
                          msg.roleMentions,
                          msg.channelMentions,
                          match,
                          playerTeamMap
                        )
                      : msg.replyTo.hasAttachment
                      ? "📷 [Lampiran Gambar]"
                      : "...",
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* PESAN UTAMA */}
        <div className="flex gap-2.5">
          <img
            src={msg.authorAvatar}
            alt=""
            className={`h-8 w-8 rounded-full border-2 shrink-0 object-cover mt-0.5 shadow-xs ${avatarBorderClass}`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1">
              <span className={`text-[12px] tracking-tight truncate ${nameColorClass}`}>
                {msg.authorGlobalName || msg.authorName}
              </span>
              {roleIcon}
              <span className="text-[10px] text-muted-foreground/80 font-mono ml-auto">
                {formatDiscordTimeOnly(msg.timestamp)}
              </span>
            </div>

            {msg.content && (
              <div
                className="text-foreground/90 whitespace-pre-wrap break-words text-[12px] leading-relaxed block space-y-1 font-normal"
                dangerouslySetInnerHTML={{
                  __html: parseDiscordMarkdown(
                    msg.content,
                    msg.userMentions,
                    msg.roleMentions,
                    msg.channelMentions,
                    match,
                    playerTeamMap
                  ),
                }}
              />
            )}

            {/* FORWARDED MESSAGE BOX */}
            {msg.forwarded && (
              <div className="mt-2 rounded-2xl border border-border/80 bg-muted/40 p-2.5 space-y-2 max-w-sm">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground italic">
                  <Forward className="h-3.5 w-3.5" /> Forwarded
                </div>

                {msg.forwarded.content && (
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                    {msg.forwarded.content}
                  </p>
                )}

                {msg.forwarded.attachments && msg.forwarded.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.forwarded.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(att.maskedUrl)}
                        className="relative group/att max-w-xs cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50 shadow-xs"
                      >
                        <img
                          src={att.maskedUrl}
                          alt={att.fileName}
                          className="max-h-56 w-full object-contain rounded-lg"
                          onError={(e: any) => {
                            e.target.src = "/placeholder-proof.webp";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity">
                          <span className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-xs">
                            <ImageIcon className="h-3.5 w-3.5" /> Perbesar
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LAMPIRAN GAMBAR */}
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
                      className="max-h-48 w-full object-contain rounded-lg"
                      onError={(e: any) => {
                        e.target.src = "/placeholder-proof.webp";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity">
                      <span className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-xs">
                        <ImageIcon className="h-3.5 w-3.5" /> Perbesar Bukti
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-card border border-border p-2 shadow-2xl"
          >
            <img
              src={previewImage}
              alt="Preview"
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
                className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
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