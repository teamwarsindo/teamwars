import { MatchScheduleItem } from "@/app/tournament/_library/types";

export const COMMON_DISCORD_EMOJIS: Record<string, string> = {
  ":smile:": "😄",
  ":joy:": "😂",
  ":fire:": "🔥",
  ":thumbsup:": "👍",
  ":thumbsdown:": "👎",
  ":heart:": "❤️",
  ":sob:": "😭",
  ":skull:": "💀",
  ":thinking:": "🤔",
  ":ok_hand:": "👌",
  ":pray:": "🙏",
  ":swords:": "⚔️",
  ":trophy:": "🏆",
  ":eyes:": "👀",
  ":100:": "💯",
  ":tada:": "🎉",
};

export function formatDiscordTimeOnly(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return (
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

export function formatDiscordDateHeader(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function parseDiscordMarkdown(
  content: string,
  userMentions?: Record<string, any>,
  roleMentions?: Record<string, any>,
  channelMentions?: Record<string, any>,
  match?: MatchScheduleItem,
  playerTeamMap: Record<string, string> = {}
): string {
  if (!content) return "";

  const teamASlug = (match?.teamAId || (match as any)?.teamACode || match?.teamAName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const teamBSlug = (match?.teamBId || (match as any)?.teamBCode || match?.teamBName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const matchReferee = (match?.referee || "").trim().toLowerCase();
  const matchStreamer = (match?.streamer || "").trim().toLowerCase();

  const checkAffiliation = (key: string) => {
    if (!key) return "";
    return (
      playerTeamMap[key] ||
      Object.entries(playerTeamMap).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1] ||
      ""
    );
  };

  // 1. URL clickable
  let formatted = content.replace(
    /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-500 hover:text-sky-400 font-medium underline underline-offset-2 break-all">$1</a>'
  );

  formatted = formatted.replace(
    /(?<!href=")(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-sky-500 hover:text-sky-400 font-medium underline underline-offset-2 break-all">$1</a>'
  );

  // 2. Bold, Italic, Strike, Code
  formatted = formatted
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/~~(.*?)~~/g, '<del class="line-through text-muted-foreground">$1</del>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded font-mono text-[11px] text-foreground border border-border">$1</code>');

  // 3. Custom Discord Emoji CDN
  formatted = formatted.replace(
    /<(a)?:([a-zA-Z0-9_~]+):([0-9]+)>/g,
    (_, isAnimated, name, id) => {
      const ext = isAnimated ? "gif" : "webp";
      return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=44&quality=lossless" alt=":${name}:" title=":${name}:" class="inline-block h-5 w-5 align-sub mx-0.5 object-contain" />`;
    }
  );

  // 4. Shortcode Emojis
  for (const [code, emoji] of Object.entries(COMMON_DISCORD_EMOJIS)) {
    formatted = formatted.replaceAll(code, emoji);
  }

  // 5. Everyone & Here Mentions
  formatted = formatted.replace(
    /(@everyone|@here)/g,
    '<span class="inline-flex items-center px-1.5 py-0.2 rounded font-semibold text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">$1</span>'
  );

  // 6. User Mentions (Cocokkan userId dan nama ke playerTeamMap)
  formatted = formatted.replace(/<@!?([0-9]+)>/g, (_, userId) => {
    const u = userMentions?.[userId];
    const rawName = typeof u === "object" ? u?.name : (u || "User");
    const uLower = rawName.toLowerCase();

    // Cek afiliasi langsung via userId, lalu via rawName
    const uSlug = checkAffiliation(userId) || checkAffiliation(rawName);
    const isU1 = Boolean(uSlug && (uSlug === teamASlug || teamASlug.includes(uSlug)));
    const isU2 = Boolean(uSlug && (uSlug === teamBSlug || teamBSlug.includes(uSlug)));

    const isURef = Boolean(
      (match?.refereeDiscordId && userId === match.refereeDiscordId) ||
      (matchReferee && matchReferee !== "-" && (uLower.includes(matchReferee) || matchReferee.includes(uLower)))
    );
    const isUStr = Boolean(
      (match?.streamerDiscordId && userId === match.streamerDiscordId) ||
      (matchStreamer && matchStreamer !== "-" && (uLower.includes(matchStreamer) || matchStreamer.includes(uLower)))
    );

    let tagStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    if (isURef) tagStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    else if (isUStr) tagStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
    else if (isU1) tagStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    else if (isU2) tagStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";

    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold border ${tagStyle}">@${rawName}</span>`;
  });

  // 7. Role Mentions
  formatted = formatted.replace(/<@&([0-9]+)>/g, (_, roleId) => {
    const r = roleMentions?.[roleId];
    const roleName = typeof r === "object" ? r?.name : (r || "Role");
    const rLower = roleName.toLowerCase();

    const isTeam1Role = (match as any)?.roleAId === roleId || (match?.teamAName && rLower.includes(match.teamAName.toLowerCase()));
    const isTeam2Role = (match as any)?.roleBId === roleId || (match?.teamBName && rLower.includes(match.teamBName.toLowerCase()));
    const isRefereeRole = rLower.includes("wasit") || rLower.includes("referee") || rLower.includes("ref");
    const isStreamerRole = rLower.includes("streamer") || rLower.includes("caster") || rLower.includes("stream");

    let roleTagStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    if (isTeam1Role) roleTagStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    else if (isTeam2Role) roleTagStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    else if (isRefereeRole) roleTagStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    else if (isStreamerRole) roleTagStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";

    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-xs font-semibold border ${roleTagStyle}">@${roleName}</span>`;
  });

  // 8. Channel Mentions
  formatted = formatted.replace(/<#([0-9]+)>/g, (_, channelId) => {
    const ch = channelMentions?.[channelId];
    const channelName = typeof ch === "object" ? ch?.name : (ch || "channel");
    return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20 align-middle">#${channelName}</span>`;
  });

  return formatted;
}
