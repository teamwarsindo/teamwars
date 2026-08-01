import { DISCORD_CONFIG } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export function buildMainBidEmbed(data: any, isClosed: boolean = false) {
  const statusTitle = isClosed ? "🔴 LELANG PENAMAAN DIVISI TWI 2026 (DITUTUP)" : "🏆 LELANG PENAMAAN DIVISI TWI 2026";
  const statusDesc = isClosed 
    ? "❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh tim yang berpartisipasi." 
    : "🔥 **Kesempatan memberikan nama resmi Divisi TWI 2026!**\nSilakan klik tombol di bawah untuk melakukan penawaran.";

  const formatGroupCard = (groupData: any) => {
    if (!groupData) {
      return [
        "```yaml",
        "STATUS : BELUM ADA BID",
        "BASE   : Rp 100.000",
        "MIN BID: Rp 110.000",
        "```"
      ].join("\n");
    }

    return [
      "```fix",
      `HIGHEST BID: ${formatRupiah(groupData.amount)}`,
      `NAMA DIVISI: "${groupData.name}"`,
      "```",
      `👤 **Penawar:** <@${groupData.userId}>`
    ].join("\n");
  };

  return {
    title: statusTitle,
    description: statusDesc,
    color: isClosed ? 0xED4245 : 0xFEE75C,
    fields: [
      {
        name: "🥇 GROUP A — HIGHEST BIDDER",
        value: formatGroupCard(data.groupA),
        inline: false
      },
      {
        name: "🥇 GROUP B — HIGHEST BIDDER",
        value: formatGroupCard(data.groupB),
        inline: false
      },
      {
        name: "📋 Ketentuan Lelang",
        value: "▫️ **Harga Awal:** Rp 100.000 (Base)\n▫️ **Kelipatan Bid:** Rp 10.000\n▫️ **Batas Waktu:** 8 Agustus 2026, Pukul 20:00 WIB"
      }
    ],
    footer: { text: "Team Wars Indonesia • Auto-updated Live System" },
    timestamp: new Date().toISOString()
  };
}

export async function patchMainBidMessage(msgId: string, data: any, isClosed: boolean, token: string) {
  const embed = buildMainBidEmbed(data, isClosed);
  const components = getBidButtons(isClosed);

  await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed], components })
  });
}
