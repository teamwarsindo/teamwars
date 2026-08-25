"use client";

import { useState } from "react";
import { formatDiscordTimeOnly, parseDiscordMarkdown } from "../_utils/discord-parser";
import { Image as ImageIcon, ExternalLink, Shield, Tv, ShieldAlert } from "lucide-react";
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
  attachments?: Array<{
    fileName: string;
    maskedUrl: string;
    contentType?: string;
  }>;
}

interface ChatMessageItemProps {
  msg: ChatLogMessage;
  match?: MatchScheduleItem;
  playerTeamMap?: Record<string, string>;
  isHighlighted?: boolean;
}

export function ChatMessageItem({
  msg,
  match,
  playerTeamMap = {},
  isHighlighted = false,
}: ChatMessageItemProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const name1 = (msg.authorGlobalName || "").trim();
  const name2 = (msg.authorName || "").trim();
  const n1Lower = name1.toLowerCase();
  const n2Lower = name2.toLowerCase();
  const authorId = msg.authorId || "";

  // 1. Deteksi Wasit
  const matchReferee = (match?.referee || "").trim().toLowerCase();
  const isReferee = Boolean(
    (match?.refereeDiscordId && authorId === match.refereeDiscordId) ||
    (matchReferee && matchReferee !== "-" && (n1Lower.includes(matchReferee) || n2Lower.includes(matchReferee) || matchReferee.includes(n1Lower) || matchReferee.includes(n2Lower)))
  );

  // 2. Deteksi Streamer
  const matchStreamer = (match?.streamer || "").trim().toLowerCase();
  const isStreamer = Boolean(
    (match?.streamerDiscordId && authorId === match.streamerDiscordId) ||
    (matchStreamer && matchStreamer !== "-" && (n1Lower.includes(matchStreamer) || n2Lower.includes(matchStreamer) || matchStreamer.includes(n1Lower) || matchStreamer.includes(n2Lower)))
  );

  // 3. Deteksi Tim Kiri (A) vs Tim Kanan (B)
  const teamASlug = (match?.teamAId || (match as any)?.teamACode || match?.teamAName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const teamBSlug = (match?.teamBId || (match as any)?.teamBCode || match?.teamBName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

  const cleanTeamAName = (match?.teamAName || "").toLowerCase();
  const cleanTeamBName = (match?.teamBName || "").toLowerCase();

  const checkAffiliation = (uName: string) => {
    if (!uName) return "";
    return (
      playerTeamMap[uName] ||
      Object.entries(playerTeamMap).find(([ign]) => ign.toLowerCase() === uName.toLowerCase())?.[1] ||
      ""
    );
  };

  let isTeam1 = false;
  let isTeam2 = false;

  if (!isReferee && !isStreamer) {
    const userTeamSlug = checkAffiliation(name1) || checkAffiliation(name2);

    isTeam1 = Boolean(
      userTeamSlug &&
      (userTeamSlug === teamASlug || teamASlug.includes(userTeamSlug) || cleanTeamAName.includes(userTeamSlug.replace(/-/g, " ")))
    );

    isTeam2 = Boolean(
      userTeamSlug &&
      (userTeamSlug === teamBSlug || teamBSlug.includes(userTeamSlug) || cleanTeamBName.includes(userTeamSlug.replace(/-/g, " ")))
    );
  }

  // 4. Skema Warna & Icon Author
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
        alt={match?.teamAName || "Tim A"}
        title={match?.teamAName || "Tim A"}
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
        alt={match?.teamBName || "Tim B"}
        title={match?.teamBName || "Tim B"}
        className="h-4 w-4 rounded-full border border-amber-500/40 object-cover inline-block shadow-2xs"
        onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
      />
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
