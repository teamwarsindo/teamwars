"use client";

import React, { useState } from "react";
import { formatDiscordTimeOnly } from "../_utils/discord-parser";
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

  // 4. Skema Warna & Icon Author (Selain Wasit/Streamer/Tim otomatis dianggap Admin)
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

  // 5. Helper Parse Markdown (Bold, Italic, Code, Strikethrough)
  const parseInlineMarkdown = (text: string, keyPrefix: string) => {
    const mdRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|~~[^~]+~~|`[^`]+`)/g;
    const tokens = text.split(mdRegex);

    return tokens.map((tok, tIdx) => {
      const k = `${keyPrefix}-tok-${tIdx}`;

      if (tok.startsWith("**") && tok.endsWith("**")) {
        return <strong key={k} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>;
      }
      if (tok.startsWith("__") && tok.endsWith("__")) {
        return <u key={k}>{tok.slice(2, -2)}</u>;
      }
      if (tok.startsWith("*") && tok.endsWith("*")) {
        return <em key={k}>{tok.slice(1, -1)}</em>;
      }
      if (tok.startsWith("~~") && tok.endsWith("~~")) {
        return <del key={k}>{tok.slice(2, -2)}</del>;
      }
      if (tok.startsWith("`") && tok.endsWith("`")) {
        return (
          <code key={k} className="bg-muted px-1 py-0.5 rounded font-mono text-[11px] text-foreground border border-border">
            {tok.slice(1, -1)}
          </code>
        );
      }

      return tok;
    });
  };

  // 6. Parser Lengkap (Emoji, Mentions Berwarna & Markdown)
  const renderChatContent = (content: string) => {
    if (!content) return null;

    const parts = content.split(/(<a?:\w+:\d+>|<@[!&]?\d+>|@everyone|@here)/g);

    return parts.map((part, index) => {
      // A. Discord Custom Emoji CDN
      const emojiMatch = part.match(/^<(a?):(\w+):(\d+)>$/);
      if (emojiMatch) {
        const isAnimated = emojiMatch[1] === "a";
        const emojiName = emojiMatch[2];
        const emojiId = emojiMatch[3];
        const ext = isAnimated ? "gif" : "webp";
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=48&quality=lossless`;

        return (
          <img
            key={index}
            src={emojiUrl}
            alt={`:${emojiName}:`}
            title={`:${emojiName}:`}
            className="inline-block h-6 w-6 object-contain align-middle mx-0.5"
            onError={(e: any) => {
              e.target.outerHTML = `:${emojiName}:`;
            }}
          />
        );
      }

      // B. Everyone & Here
      if (part === "@everyone" || part === "@here") {
        return (
          <span
            key={index}
            className="inline-block px-1 py-0.2 mx-0.5 rounded font-semibold text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          >
            {part}
          </span>
        );
      }

      // C. Role Mentions Berwarna Lengkap
      const roleMatch = part.match(/^<@&(\d+)>$/);
      if (roleMatch) {
        const rId = roleMatch[1];
        const rInfo = msg.roleMentions?.[rId];
        const rName = rInfo?.name || "Role";
        const rLower = rName.toLowerCase();

        const isTeam1Role = (match as any)?.roleAId === rId || (match?.teamAName && rLower.includes(match.teamAName.toLowerCase()));
        const isTeam2Role = (match as any)?.roleBId === rId || (match?.teamBName && rLower.includes(match.teamBName.toLowerCase()));
        const isRefereeRole = rLower.includes("wasit") || rLower.includes("referee") || rLower.includes("ref");
        const isStreamerRole = rLower.includes("streamer") || rLower.includes("caster") || rLower.includes("stream");

        // Role selain tim/wasit/streamer otomatis dianggap role Admin
        let roleTagStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
        if (isTeam1Role) roleTagStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
        else if (isTeam2Role) roleTagStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
        else if (isRefereeRole) roleTagStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
        else if (isStreamerRole) roleTagStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";

        return (
          <span
            key={index}
            className={`inline-block px-1.5 py-0.2 mx-0.5 rounded text-xs font-semibold border ${roleTagStyle}`}
          >
            @{rName}
          </span>
        );
      }

      // D. User Mentions Berwarna Lengkap
      const userMatch = part.match(/^<@!?(\d+)>$/);
      if (userMatch) {
        const uId = userMatch[1];
        const uInfo = msg.userMentions?.[uId];
        const uName = uInfo?.name || "User";
        const uLower = uName.toLowerCase();

        const uSlug = checkAffiliation(uName);
        const isU1 = uSlug && (uSlug === teamASlug || teamASlug.includes(uSlug));
        const isU2 = uSlug && (uSlug === teamBSlug || teamBSlug.includes(uSlug));
        const isURef = Boolean(
          (match?.refereeDiscordId && uId === match.refereeDiscordId) ||
          (matchReferee && matchReferee !== "-" && (uLower.includes(matchReferee) || matchReferee.includes(uLower)))
        );
        const isUStr = Boolean(
          (match?.streamerDiscordId && uId === match.streamerDiscordId) ||
          (matchStreamer && matchStreamer !== "-" && (uLower.includes(matchStreamer) || matchStreamer.includes(uLower)))
        );

        // User selain tim/wasit/streamer otomatis dianggap Admin
        let userTagStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
        if (isURef) userTagStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
        else if (isUStr) userTagStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
        else if (isU1) userTagStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
        else if (isU2) userTagStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";

        return (
          <span
            key={index}
            className={`inline-block px-1.5 py-0.2 mx-0.5 rounded text-xs font-semibold border ${userTagStyle}`}
          >
            @{uName}
          </span>
        );
      }

      // E. Render Markdown pada plain text
      return <React.Fragment key={index}>{parseInlineMarkdown(part, `p-${index}`)}</React.Fragment>;
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
  
