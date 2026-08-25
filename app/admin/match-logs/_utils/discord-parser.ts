import { DISCORD_CONFIG } from "@/lib/discord/config";

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

// Kamus Role Statis dari config
const STATIC_ROLES: Record<string, string> = {
  [DISCORD_CONFIG.ROLE_REFEREE]: "Wasit",
  [DISCORD_CONFIG.ROLE_STREAMER]: "Streamer",
  [DISCORD_CONFIG.ROLE_ADMIN]: "Admin",
  [DISCORD_CONFIG.ROLE_CHIEF]: "Chief Wasit",
  [DISCORD_CONFIG.ROLE_PENGAWAS]: "Pengawas",
  [DISCORD_CONFIG.ROLE_DUELIST]: "Duelist",
  [DISCORD_CONFIG.ROLE_KETUA]: "Ketua Tim",
  [DISCORD_CONFIG.ROLE_WAKIL]: "Wakil Tim",
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

export function parseDiscordMarkdown(
  content: string,
  userMentions?: Record<string, string>,
  matchContext?: { teamAName?: string; teamBName?: string }
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

  // 3. User Mention: Ganti <@ID> dengan Nama Asli Duelist/Wasit
  formatted = formatted.replace(/<@!?([0-9]+)>/g, (match, userId) => {
    const targetName = userMentions?.[userId];
    const label = targetName ? `@${targetName}` : "@Pemain";
    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded-md bg-primary/15 text-primary font-bold text-[11px]">${label}</span>`;
  });

  // 4. Role Mention: Ganti <@&ID> dengan Nama Role / Tim
  formatted = formatted.replace(/<@&([0-9]+)>/g, (match, roleId) => {
    let roleName = STATIC_ROLES[roleId];
    if (!roleName) {
      // Jika role dinamis tim match, berikan label kontekstual Tim
      roleName = matchContext?.teamAName || matchContext?.teamBName ? "Tim / Role" : "Role";
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
    
