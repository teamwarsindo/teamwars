import { DISCORD_CONFIG } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export function buildMainBidEmbed(data: any, isClosed: boolean = false) {
  const statusTitle = isClosed ? "🔴 LELANG PENAMAAN DIVISI TWI 2026 (DITUTUP)" : "🏆 LELANG PENAMAAN DIVISI TWI 2026";
  const statusDesc = isClosed 
    ? "❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh tim yang berpartisipasi." 
    : "Bidding dilakukan secara otomatis melalui bot. Klik tombol di bawah untuk mengajukan bid!";

  return {
    title: statusTitle,
    description: statusDesc,
    color: isClosed ? 0xED4245 : 0x5865F2,
    fields: [
      {
        name: "🥇 Group A - Highest Bid",
        value: data.groupA 
          ? `**${formatRupiah(data.groupA.amount)}** — *"${data.groupA.name}"*\nOleh: <@${data.groupA.userId}>`
          : "Belum ada bid (Base: Rp100.000)",
        inline: true
      },
      {
        name: "🥇 Group B - Highest Bid",
        value: data.groupB 
          ? `**${formatRupiah(data.groupB.amount)}** — *"${data.groupB.name}"*\nOleh: <@${data.groupB.userId}>`
          : "Belum ada bid (Base: Rp100.000)",
        inline: true
      },
      {
        name: "ℹ️ Ketentuan Bidding",
        value: "• **Harga Awal:** Rp100.000\n• **Kelipatan:** Rp10.000\n• **Batas Waktu:** 8 Agustus 2026 (20:00 WIB)"
      }
    ],
    footer: { text: "Team Wars Indonesia • Auto-updated" },
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
