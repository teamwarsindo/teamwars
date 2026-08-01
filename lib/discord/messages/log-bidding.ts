import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah } from '@/lib/discord/messages/bidding';

export function buildLogBidEmbed(logs: Array<any>) {
  const logList = logs.slice(0, 10).map((log) => {
    const groupLabel = log.group === "BOTH" ? "Group A & B" : `Group ${log.group}`;
    const displayName = log.displayName || log.username; // Pakai Display Name / Server Nick
    return `\`[${log.timestamp}]\` **${displayName}** bid **${formatRupiah(log.amount)}** ➔ **${groupLabel}** (*"${log.name}"*)`;
  }).join("\n\n") || "_Belum ada riwayat bidding._";

  return {
    title: "📜 LIVE LOG RIWAYAT BIDDING",
    description: logList,
    color: 0x2B2D31,
    footer: { text: "Menampilkan 10 riwayat bidding terbaru" }
  };
}

export async function patchLogBidMessage(msgId: string, logs: Array<any>, token: string) {
  const embed = buildLogBidEmbed(logs);

  await fetch(`[https://discord.com/api/v10/channels/$](https://discord.com/api/v10/channels/$){DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] })
  });
}
