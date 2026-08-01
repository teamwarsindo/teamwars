import { DISCORD_CONFIG } from "@/lib/discord/config";
import { getFooterText } from "@/lib/discord/utils";

export interface RouletteLogData {
  teamName: string;
  teamLogo: string;
  targetGroup: "Group A" | "Group B";
  slotNumber: number;
}

// 🎯 Embed saat tim berhasil terpilih
export function buildRouletteLogEmbed(data: RouletteLogData) {
  const isGroupA = data.targetGroup === "Group A";
  const colorCode = isGroupA ? 0x00F0FF : 0xF59E0B; // Cyan untuk Group A, Amber untuk Group B

  return {
    embeds: [
      {
        title: `🎉 TIM TERPILIH — ${data.targetGroup.toUpperCase()}`,
        description: `**${data.teamName}** resmi menempati **Slot #${data.slotNumber}** di **${data.targetGroup}**!`,
        color: colorCode,
        thumbnail: {
          url: data.teamLogo && data.teamLogo.startsWith("http")
            ? data.teamLogo
            : "https://teamwars.web.id/logo.webp",
        },
        fields: [
          { name: "Nama Tim", value: data.teamName, inline: true },
          { name: "Target Slot", value: `${data.targetGroup} (Slot #${data.slotNumber})`, inline: true },
          { name: "Waktu Draw", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        ],
        footer: {
          text: getFooterText(),
          icon_url: "https://teamwars.web.id/logo.webp",
        },
      },
    ],
  };
}

// 🔄 Embed saat admin melakukan Reset Draw
export function buildRouletteResetEmbed() {
  return {
    embeds: [
      {
        title: "🔄 Reset Draw",
        description: "Pengundian group telah di-reset oleh Admin. Seluruh tim dikembalikan ke dalam Roda Roulette dan log pengundian sebelumnya telah dibersihkan.",
        color: 0xEF4444, // Red
        footer: {
          text: getFooterText(),
          icon_url: "https://teamwars.web.id/logo.webp",
        },
      },
    ],
  };
}
