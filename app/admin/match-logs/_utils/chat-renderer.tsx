import React from "react";
import { Shield, Tv, ShieldAlert, Hash } from "lucide-react";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { ChatLogMessage } from "../_components/chat-message-item";

export interface AuthorRoleResult {
  role: "referee" | "streamer" | "teamA" | "teamB" | "admin";
  nameColorClass: string;
  avatarBorderClass: string;
  icon: React.ReactNode;
}

// 1. Helper Penentuan Peran, Warna & Icon Pengirim
export function resolveAuthorRole(
  msg: ChatLogMessage,
  match?: MatchScheduleItem,
  playerTeamMap: Record<string, string> = {}
): AuthorRoleResult {
  const name1 = (msg.authorGlobalName || "").trim();
  const name2 = (msg.authorName || "").trim();
  const n1Lower = name1.toLowerCase();
  const n2Lower = name2.toLowerCase();
  const authorId = msg.authorId || "";

  // Wasit
  const matchReferee = (match?.referee || "").trim().toLowerCase();
  const isReferee = Boolean(
    (match?.refereeDiscordId && authorId === match.refereeDiscordId) ||
    (matchReferee && matchReferee !== "-" && (n1Lower.includes(matchReferee) || n2Lower.includes(matchReferee) || matchReferee.includes(n1Lower) || matchReferee.includes(n2Lower)))
  );

  if (isReferee) {
    return {
      role: "referee",
      nameColorClass: "text-emerald-600 dark:text-emerald-400 font-semibold",
      avatarBorderClass: "border-emerald-500",
      icon: (
        <span title="Wasit" className="inline-flex items-center text-emerald-500 dark:text-emerald-400">
          <Shield className="h-3.5 w-3.5 fill-emerald-500/20" />
        </span>
      ),
    };
  }

  // Streamer
  const matchStreamer = (match?.streamer || "").trim().toLowerCase();
  const isStreamer = Boolean(
    (match?.streamerDiscordId && authorId === match.streamerDiscordId) ||
    (matchStreamer && matchStreamer !== "-" && (n1Lower.includes(matchStreamer) || n2Lower.includes(matchStreamer) || matchStreamer.includes(n1Lower) || matchStreamer.includes(n2Lower)))
  );

  if (isStreamer) {
    return {
      role: "streamer",
      nameColorClass: "text-purple-600 dark:text-purple-400 font-semibold",
      avatarBorderClass: "border-purple-500",
      icon: (
        <span title="Streamer" className="inline-flex items-center text-purple-500 dark:text-purple-400">
          <Tv className="h-3.5 w-3.5" />
        </span>
      ),
    };
  }

  // Tim A vs Tim B
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

  const userTeamSlug = checkAffiliation(name1) || checkAffiliation(name2);

  if (userTeamSlug && (userTeamSlug === teamASlug || teamASlug.includes(userTeamSlug) || cleanTeamAName.includes(userTeamSlug.replace(/-/g, " ")))) {
    return {
      role: "teamA",
      nameColorClass: "text-sky-600 dark:text-sky-400 font-semibold",
      avatarBorderClass: "border-sky-500",
      icon: (
        <img
          src={match?.teamALogo || "/placeholder-team.png"}
          alt={match?.teamAName || "Tim A"}
          title={match?.teamAName || "Tim A"}
          className="h-4 w-4 rounded-full border border-sky-500/40 object-cover inline-block shadow-2xs"
          onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
        />
      ),
    };
  }

  if (userTeamSlug && (userTeamSlug === teamBSlug || teamBSlug.includes(userTeamSlug) || cleanTeamBName.includes(userTeamSlug.replace(/-/g, " ")))) {
    return {
      role: "teamB",
      nameColorClass: "text-amber-600 dark:text-amber-400 font-semibold",
      avatarBorderClass: "border-amber-500",
      icon: (
        <img
          src={match?.teamBLogo || "/placeholder-team.png"}
          alt={match?.teamBName || "Tim B"}
          title={match?.teamBName || "Tim B"}
          className="h-4 w-4 rounded-full border border-amber-500/40 object-cover inline-block shadow-2xs"
          onError={(e: any) => { e.target.src = "/placeholder-team.png"; }}
        />
      ),
    };
  }

  // Admin / Lainnya
  return {
    role: "admin",
    nameColorClass: "text-rose-600 dark:text-rose-400 font-semibold",
    avatarBorderClass: "border-rose-500/50",
    icon: (
      <span title="Admin / Panitia" className="inline-flex items-center text-rose-500 dark:text-rose-400">
        <ShieldAlert className="h-3.5 w-3.5 fill-rose-500/20" />
      </span>
    ),
  };
}

// 2. Helper Parsing Inline Markdown & URLs
function parseInlineMarkdown(text: string, keyPrefix: string) {
  const mdRegex = /(\[\S+?\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|~~[^~]+~~|`[^`]+`)/g;
  const tokens = text.split(mdRegex);

  return tokens.map((tok, tIdx) => {
    const k = `${keyPrefix}-tok-${tIdx}`;

    // Markdown Link [Text](URL)
    const mdLinkMatch = tok.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdLinkMatch) {
      return (
        <a
          key={k}
          href={mdLinkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-500 hover:text-sky-400 underline font-medium inline-flex items-center gap-0.5 break-all"
        >
          {mdLinkMatch[1]}
        </a>
      );
    }

    // Auto Plain URL (https://...)
    if (tok.startsWith("http://") || tok.startsWith("https://")) {
      return (
        <a
          key={k}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-500 hover:text-sky-400 underline font-medium inline-flex items-center gap-0.5 break-all"
        >
          {tok}
        </a>
      );
    }

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
}

// 3. Main Function Parser Chat Content
export function renderChatContent(
  content: string,
  msg: ChatLogMessage,
  match?: MatchScheduleItem,
  playerTeamMap: Record<string, string> = {}
) {
  if (!content) return null;

  const teamASlug = (match?.teamAId || (match as any)?.teamACode || match?.teamAName || "").toLowerCase().replace(/\s+/g, "-");
  const teamBSlug = (match?.teamBId || (match as any)?.teamBCode || match?.teamBName || "").toLowerCase().replace(/\s+/g, "-");
  const matchReferee = (match?.referee || "").trim().toLowerCase();
  const matchStreamer = (match?.streamer || "").trim().toLowerCase();

  const checkAffiliation = (uName: string) => {
    if (!uName) return "";
    return (
      playerTeamMap[uName] ||
      Object.entries(playerTeamMap).find(([ign]) => ign.toLowerCase() === uName.toLowerCase())?.[1] ||
      ""
    );
  };

  const parts = content.split(/(<a?:\w+:\d+>|<@[!&]?\d+>|<#\d+>|@everyone|@here)/g);

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

    // B. Tag Channel Discord
    const channelMatch = part.match(/^<#(\d+)>$/);
    if (channelMatch) {
      const cId = channelMatch[1];
      const channelName = (msg as any).channelMentions?.[cId]?.name || "channel";

      return (
        <span
          key={index}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20 align-middle"
        >
          <Hash className="h-3 w-3" />
          <span>{channelName}</span>
        </span>
      );
    }

    // C. Everyone & Here
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

    // D. Role Mentions
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

    // E. User Mentions
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

    // F. Parse plain text
    return <React.Fragment key={index}>{parseInlineMarkdown(part, `p-${index}`)}</React.Fragment>;
  });
}
