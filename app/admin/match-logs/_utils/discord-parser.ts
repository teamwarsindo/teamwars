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
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }) + " WIB";
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
  roleMentions?: Record<string, any>
): string {
  if (!content) return "";

  // 1. URL clickable
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let formatted = content.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary font-medium underline underline-offset-2 hover:opacity-80 break-all">${url}</a>`;
  });

  // 2. Bold & Italic Markdown
  formatted = formatted
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // 3. Custom Discord Emoji (<:name:id> / <a:name:id>)
  formatted = formatted.replace(
    /<(a)?:([a-zA-Z0-9_~]+):([0-9]+)>/g,
    (_, isAnimated, name, id) => {
      const ext = isAnimated ? "gif" : "webp";
      return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=44&quality=lossless" alt=":${name}:" title=":${name}:" class="inline-block h-5 w-5 align-sub mx-0.5 object-contain" />`;
    }
  );

  // 4. Shortcode Bawaan
  for (const [code, emoji] of Object.entries(COMMON_DISCORD_EMOJIS)) {
    formatted = formatted.replaceAll(code, emoji);
  }

  // 5. 🟢 User Mentions: Warna Biru Langit Standar UI Discord
  formatted = formatted.replace(/<@!?([0-9]+)>/g, (match, userId) => {
    const u = userMentions?.[userId];
    const name = typeof u === "object" ? u?.name : u;
    const label = name ? `@${name}` : "@Pemain";
    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold text-[11px]">${label}</span>`;
  });

  // 6. 🟢 Role Mentions: Warna Indigo Standar UI Discord
  formatted = formatted.replace(/<@&([0-9]+)>/g, (match, roleId) => {
    const r = roleMentions?.[roleId];
    const roleName = typeof r === "object" ? r?.name : (r || "Role");
    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">@${roleName}</span>`;
  });

  // 7. Channel Mentions
  formatted = formatted.replace(
    /<#([0-9]+)>/g,
    `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-mono text-[10.5px]">#channel</span>`
  );

  return formatted;
}
