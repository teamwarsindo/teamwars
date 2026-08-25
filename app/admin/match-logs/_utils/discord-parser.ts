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

export function formatDiscordTimestamp(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
  const timeStr = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${dateStr}, ${timeStr} WIB`;
}

// 🟢 Helper Penyesuai Warna Kontras Dark/Light
export function getAdaptiveRoleStyle(hexColor?: string) {
  if (!hexColor || hexColor === "#000000" || hexColor.toLowerCase() === "#ffffff") {
    return {
      style: {},
      className: "bg-primary/15 text-primary border-primary/20",
    };
  }

  return {
    style: {
      color: hexColor,
      backgroundColor: `${hexColor}18`, // Opacity 10%
      borderColor: `${hexColor}35`,
    },
    className: "border shadow-2xs",
  };
}

export function parseDiscordMarkdown(
  content: string,
  userMentions?: Record<string, any>,
  roleMentions?: Record<string, any>
): string {
  if (!content) return "";

  // 1. Custom Discord Emoji
  let formatted = content.replace(
    /<(a)?:([a-zA-Z0-9_~]+):([0-9]+)>/g,
    (_, isAnimated, name, id) => {
      const ext = isAnimated ? "gif" : "webp";
      return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=44&quality=lossless" alt=":${name}:" title=":${name}:" class="inline-block h-5 w-5 align-sub mx-0.5 object-contain" />`;
    }
  );

  // 2. Shortcode Bawaan
  for (const [code, emoji] of Object.entries(COMMON_DISCORD_EMOJIS)) {
    formatted = formatted.replaceAll(code, emoji);
  }

  // 3. User Mention
  formatted = formatted.replace(/<@!?([0-9]+)>/g, (match, userId) => {
    const u = userMentions?.[userId];
    const name = typeof u === "object" ? u?.name : u;
    const label = name ? `@${name}` : "@Pemain";
    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold text-[11px]">${label}</span>`;
  });

  // 4. Role Mention Dinamis dengan Warna Role
  formatted = formatted.replace(/<@&([0-9]+)>/g, (match, roleId) => {
    const r = roleMentions?.[roleId];
    const roleName = typeof r === "object" ? r?.name : (r || "Role");
    const roleColor = typeof r === "object" ? r?.color : undefined;

    if (roleColor && roleColor !== "#000000") {
      return `<span style="color: ${roleColor}; background-color: ${roleColor}20; border-color: ${roleColor}40;" class="inline-flex items-center px-1.5 py-0.2 rounded-md border font-bold text-[11px]">@${roleName}</span>`;
    }

    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">@${roleName}</span>`;
  });

  // 5. Channel Mention
  formatted = formatted.replace(
    /<#([0-9]+)>/g,
    `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-mono text-[10.5px]">#channel</span>`
  );

  return formatted;
                                          }
  
