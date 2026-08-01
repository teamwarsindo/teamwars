import { getFooterText } from "@/lib/discord/utils";

export interface RouletteLogData {
  teamName: string;
  teamLogo: string;
  targetGroup: "Group A" | "Group B";
  slotNumber: number;
}

// 🎯 Embed Tim Terpilih (Sangat Simpel & Bebas Kata Judi/Slot)
export function buildRouletteLogEmbed(data: RouletteLogData) {
  const isGroupA = data.targetGroup === "Group A";
  const colorCode = isGroupA ? 0x0284C7 : 0xD97706; // Sky Blue untuk Group A, Amber untuk Group B

  return {
    embeds: [
      {
        title: `🏆 ${data.teamName.toUpperCase()}`,
        description: `Resmi masuk ke **${data.targetGroup}** *(Urutan #${data.slotNumber})*`,
        color: colorCode,
        thumbnail: {
          url: data.teamLogo && data.teamLogo.startsWith("http")
            ? data.teamLogo
            : "https://teamwars.web.id/logo.webp",
        },
        footer: {
          text: getFooterText(),
          icon_url: "https://teamwars.web.id/logo.webp",
        },
      },
    ],
  };
}

// 🔄 Embed Reset Pengundian
export function buildRouletteResetEmbed() {
  return {
    embeds: [
      {
        title: "🔄 Pengundian Direset",
        description: "Seluruh tim dikembalikan ke dalam roda pengundian.",
        color: 0xEF4444, // Merah Clean
        footer: {
          text: getFooterText(),
          icon_url: "https://teamwars.web.id/logo.webp",
        },
      },
    ],
  };
}
