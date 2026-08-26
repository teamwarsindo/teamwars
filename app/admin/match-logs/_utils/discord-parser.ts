import { MatchScheduleItem } from "@/app/tournament/_library/types";

export function formatDiscordTimeOnly(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}.${minutes} WIB`;
  } catch {
    return "";
  }
}

export function formatDiscordDateHeader(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return "";
  }
}

export function parseDiscordMarkdown(
  rawContent: string,
  userMentions: Record<string, { name: string; color?: string }> = {},
  roleMentions: Record<string, { name: string; color?: string }> = {},
  channelMentions: Record<string, { name: string }> = {},
  match?: MatchScheduleItem,
  playerTeamMap: Record<string, any> = {}
): string {
  if (!rawContent) return "";

  // 1. Escape HTML Entities
  let parsed = rawContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const teamASlug = (match?.teamAId || (match as any)?.teamACode || match?.teamAName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const teamBSlug = (match?.teamBId || (match as any)?.teamBCode || match?.teamBName || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

  const cleanTeamAName = (match?.teamAName || "").toLowerCase();
  const cleanTeamBName = (match?.teamBName || "").toLowerCase();

  const getAffiliation = (key: string): { teamSlug: string; ign?: string } | null => {
    if (!key) return null;
    const cleanKey = key.trim().toLowerCase();
    const target =
      playerTeamMap[cleanKey] ||
      Object.entries(playerTeamMap).find(([k]) => k.toLowerCase() === cleanKey)?.[1];

    if (!target) return null;
    if (typeof target === "string") return { teamSlug: target.toLowerCase(), ign: key };
    return {
      teamSlug: (target.teamSlug || "").toLowerCase(),
      ign: target.ign || key,
    };
  };

  // 2. Custom Discord Emojis (<:name:id> atau <a:name:id>)
  parsed = parsed.replace(
    /&lt;(a)?:([a-zA-Z0-9_~]+):(\d+)&gt;/g,
    (_, animated, name, id) => {
      const ext = animated ? "gif" : "webp";
      const emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=44&quality=lossless`;
      return `<img src="${emojiUrl}" alt=":${name}:" title=":${name}:" class="inline-block h-5 w-5 align-text-bottom object-contain mx-0.5 pointer-events-none select-none" loading="lazy" />`;
    }
  );

  // 3. User Mentions (<@userId> atau <@!userId>) dengan Resolusi Tim & IGN
  parsed = parsed.replace(/&lt;@!?(\d+)&gt;/g, (_, userId) => {
    const rawName = userMentions[userId]?.name || `user-${userId.slice(-4)}`;
    const affiliation = getAffiliation(userId) || getAffiliation(rawName);

    const displayName = affiliation?.ign || rawName;
    const slug = affiliation?.teamSlug || "";

    const isTeam1 = Boolean(
      slug &&
      (slug === teamASlug || teamASlug.includes(slug) || (cleanTeamAName && cleanTeamAName.includes(slug.replace(/-/g, " "))))
    );
    const isTeam2 = Boolean(
      slug &&
      (slug === teamBSlug || teamBSlug.includes(slug) || (cleanTeamBName && cleanTeamBName.includes(slug.replace(/-/g, " "))))
    );

    let badgeClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    if (isTeam1) {
      badgeClass = "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
    } else if (isTeam2) {
      badgeClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }

    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md font-semibold text-[11px] border ${badgeClass}">@${displayName}</span>`;
  });

  // 4. Role Mentions (<@&roleId>)
  parsed = parsed.replace(/&lt;@&amp;(\d+)&gt;/g, (_, roleId) => {
    const roleInfo = roleMentions[roleId];
    const roleName = roleInfo?.name || "role";
    const roleColor = roleInfo?.color;

    const customStyle = roleColor
      ? `style="color: ${roleColor}; background-color: ${roleColor}1A; border-color: ${roleColor}33;"`
      : "";

    const defaultClass = !roleColor
      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
      : "";

    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md font-semibold text-[11px] border ${defaultClass}" ${customStyle}>@${roleName}</span>`;
  });

  // 5. Channel Mentions (<#channelId>) — Render Nama Channel Asli
  parsed = parsed.replace(/&lt;#(\d+)&gt;/g, (_, chId) => {
    const chName = channelMentions[chId]?.name || `channel-${chId.slice(-4)}`;
    return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md font-semibold text-[11px] bg-primary/15 text-primary border border-primary/30">#${chName}</span>`;
  });

  // 6. Text Formatting (Bold, Italic, Strikethrough, Code, Codeblock)
  parsed = parsed.replace(/```([\s\S]*?)```/g, '<pre class="bg-muted/80 p-2 rounded-lg my-1 text-[11px] font-mono overflow-x-auto border border-border"><code>$1</code></pre>');
  parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[11px] font-mono border border-border">$1</code>');
  parsed = parsed.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  parsed = parsed.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  parsed = parsed.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  parsed = parsed.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 7. Auto Link Detection
  parsed = parsed.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all font-medium inline-flex items-center gap-0.5">$1</a>'
  );

  return parsed;
  }
