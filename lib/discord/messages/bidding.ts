import { DISCORD_CONFIG } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export function buildMainBidEmbed(data: any, isClosed: boolean = false) {
  const statusTitle = isClosed ? "🔴 LELANG PENAMAAN DIVISI TWI 2026 (DITUTUP)" : "🏆 LELANG PENAMAAN DIVISI TWI 2026";
  const statusDesc = isClosed 
    ? "❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta." 
    : "🔥 Klik tombol di bawah untuk mengajukan penawaran nama divisi.";

  // Format Teks Ringkas Group A
  const groupA = data?.groupA;
  const valA = groupA
    ? `**${formatRupiah(groupA.amount)}**\nDivisi: **"${groupA.name}"**\nBy: <@${groupA.userId}>`
    : `**Rp 0**\nDivisi: _Belum ada_\nBy: _Belum ada_`;

  // Format Teks Ringkas Group B
  const groupB = data?.groupB;
  const valB = groupB
    ? `**${formatRupiah(groupB.amount)}**\nDivisi: **"${groupB.name}"**\nBy: <@${groupB.userId}>`
    : `**Rp 0**\nDivisi: _Belum ada_\nBy: _Belum ada_`;

  return {
    title: statusTitle,
    description: statusDesc,
    color: isClosed ? 0xED4245 : 0xFEE75C, // Merah jika ditutup, Emas jika buka
    fields: [
      {
        name: "🥇 GROUP A",
        value: valA,
        inline: true // Menyamping ke kiri
      },
      {
        name: "🥇 GROUP B",
        value: valB,
        inline: true // Menyamping ke kanan (sebaris dengan Group A)
      }
    ],
    footer: { text: "Min. Bid Awal: Rp 110.000 • Kelipatan: Rp 10.000 • Auto-updated Live System" },
    timestamp: new Date().toISOString()
  };
}

export async function patchMainBidMessage(msgId: string, data: any, isClosed: boolean, token: string) {
  const embed = buildMainBidEmbed(data, isClosed);
  const components = getBidButtons(isClosed);

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed], components })
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Gagal update pesan utama Bidding:', err);
  }

  return res.ok;
    }
