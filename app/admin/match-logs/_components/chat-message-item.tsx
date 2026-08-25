"use client";

import { useState } from "react";
import { formatDiscordTimeOnly } from "../_utils/discord-parser";
import { Image as ImageIcon, ExternalLink, Shield, Tv } from "lucide-react";
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

  // 1. Deteksi Wasit Langsung dari Jadwal Match
  const matchReferee = (match?.referee || "").trim().toLowerCase();
  const isReferee = Boolean(
    (match?.refereeDiscordId && authorId === match.refereeDiscordId) ||
    (matchReferee && matchReferee !== "-" && (n1Lower.includes(matchReferee) || n2Lower.includes(matchReferee) || matchReferee.includes(n1Lower) || matchReferee.includes(n2Lower)))
  );

  // 2. Deteksi Streamer Langsung dari Jadwal Match
  const matchStreamer = (match?.streamer || "").trim().toLowerCase();
  const isStreamer = Boolean(
    (match?.streamerDiscordId && authorId === match.streamerDiscordId) ||
    (matchStreamer && matchStreamer !== "-" && (n1Lower.includes(matchStreamer) || n2Lower.includes(matchStreamer) || matchStreamer.includes(n1Lower) || matchStreamer.includes(n2Lower)))
  );

  // 3. Deteksi Tim Kiri (A) vs Tim Kanan (B) via HASH global:ign
  let isTeam1 = false;
  let isTeam2 = false;

  const teamASlug = (match?.teamAId || (match as any)?.teamACode || match?.teamAName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const teamBSlug = (match?.teamBId || (match as any)?.teamBCode || match?.teamBName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

  const cleanTeamAName = (match?.teamAName || "").toLowerCase();
  const cleanTeamBName = (match?.teamBName || "").toLowerCase();

  // Helper cek afiliasi tim
  const checkAffiliation = (uName: string) => {
    if (!uName) return "";
    return (
      playerTeamMap[uName] ||
      Object.entries(playerTeamMap).find(([ign]) => ign.toLowerCase() === uName.toLowerCase())?.[1] ||
      ""
    );
  };

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

  // 4. Skema Warna & Icon/Logo
  let nameColorClass = "text-foreground font-black";
  let avatarBorderClass = "border-border";
  let roleIcon = null;

  if (isReferee) {
    nameColorClass = "text-emerald-500 dark:text-emerald-400 font-black";
    avatarBorderClass = "border-emerald-500";
    roleIcon = (
      <span title="Wasit" className="inline-flex items-center text-emerald-500 dark:text-emerald-400">
        <Shield className="h-3.5 w-3.5 fill-emerald-500/20" />
      </span>
    );
  } else if (isStreamer) {
    nameColorClass = "text-purple-500 dark:text-purple-400 font-black";
    avatarBorderClass = "border-purple-500";
    roleIcon = (
      <span title="Streamer" className="inline-flex items-center text-purple-500 dark:text-purple-400">
        <Tv className="h-3.5 w-3.5" />
      </span>
    );
  } else if (isTeam1) {
    nameColorClass = "text-sky-500 dark:text-sky-400 font-black";
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
    nameColorClass = "text-amber-500 dark:text-amber-400 font-black";
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

  // 5. Custom Renderer Mention Tag di Konten Chat
  const renderChatContent = (content: string) => {
    if (!content) return null;

    const parts = content.split(/(<@[!&]?\d+>|@everyone|@here)/g);

    return parts.map((part, index) => {
      if (part === "@everyone" || part === "@here") {
        return (
          <span
            key={index}
            className="inline-block px-1 py-0.5 mx-0.5 rounded font-bold text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          >
            {part}
          </span>
        );
      }

      const roleMatch = part.match(/^<@&(\d+)>$/);
      const userMatch = part.match(/^<@!?(\d+)>$/);

      if (roleMatch) {
        const rId = roleMatch[1];
        const rInfo = msg.roleMentions?.[rId];
        const rName = rInfo?.name || "Role";

        const isTeam1Role = (match as any)?.roleAId === rId || (match?.teamAName && rName.toLowerCase().includes(match.teamAName.toLowerCase()));
        const isTeam2Role = (match as any)?.roleBId === rId || (match?.teamBName && rName.toLowerCase().includes(match.teamBName.toLowerCase()));

        let roleTagStyle = "bg-primary/10 text-primary border-primary/20";
        if (isTeam1Role) roleTagStyle = "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/30 font-bold";
        if (isTeam2Role) roleTagStyle = "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30 font-bold";

        return (
          <span
            key={index}
            className={`inline-block px-1.5 py-0.2 mx-0.5 rounded text-xs font-semibold border ${roleTagStyle}`}
          >
            @{rName}
          </span>
        );
      }

      if (userMatch) {
        const uId = userMatch[1];
        const uInfo = msg.userMentions?.[uId];
        const uName = uInfo?.name || "User";

        const uSlug = checkAffiliation(uName);
        const isU1 = uSlug && (uSlug === teamASlug || teamASlug.includes(uSlug));
        const isU2 = uSlug && (uSlug === teamBSlug || teamBSlug.includes(uSlug));

        let userTagStyle = "bg-muted text-muted-foreground border-border";
        if (isU1) userTagStyle = "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/30 font-bold";
        if (isU2) userTagStyle = "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30 font-bold";

        return (
          <span
            key={index}
            className={`inline-block px-1.5 py-0.2 mx-0.5 rounded text-xs font-medium border ${userTagStyle}`}
          >
            @{uName}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

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
            <div className="text-foreground/90 whitespace-pre-wrap break-words text-[12px] leading-relaxed block space-y-1 font-normal">
              {renderChatContent(msg.content)}
            </div>
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
