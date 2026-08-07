import { DISCORD_CONFIG } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

// 🟢 HELPER HITUNG SISA WAKTU MANUAL (WIB)
export function getRemainingTimeText(): { text: string; isClosed: boolean } {
  // Target: Sabtu, 8 Agustus 2026, 20:00:00 WIB (UTC+7) -> 13:00:00 UTC
  const targetTime = new Date('2026-08-08T20:00:00+07:00').getTime();
  const now = Date.now();
  const diffMs = targetTime - now;

  if (diffMs <= 0) {
    return { text: '`Lelang Telah Resmi Ditutup`', isClosed: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Hari`);
  if (hours > 0) parts.push(`${hours} Jam`);
  parts.push(`${minutes} Menit`);

  return {
    text: `⏳ **${parts.join(' ')} lagi**`,
    isClosed: false,
  };
}

export function buildMainBidEmbed(data: any, forceClosed: boolean = false) {
  const { text: remainingText, isClosed: timeIsClosed } = getRemainingTimeText();
  const isClosed = forceClosed || timeIsClosed;

  const statusTitle = isClosed ? '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7 (DITUTUP)' : '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7';
  const statusDesc = isClosed
    ? '❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta.'
    : 'Klik tombol di bawah untuk mengajukan penawaran nama divisi.';

  const groupA = data?.groupA;
  const valA = groupA
    ? `💰 **${formatRupiah(groupA.amount)}** oleh <@${groupA.userId}>`
    : `💰 **Rp 0** oleh _Belum ada_`;
  const nameA = groupA?.name ? groupA.name : 'Belum ada';

  const groupB = data?.groupB;
  const valB = groupB
    ? `💰 **${formatRupiah(groupB.amount)}** oleh <@${groupB.userId}>`
    : `💰 **Rp 0** oleh _Belum ada_`;
  const nameB = groupB?.name ? groupB.name : 'Belum ada';

  return {
    title: statusTitle,
    description: statusDesc,
    color: isClosed ? 0xed4245 : 0xfee75c,
    fields: [
      {
        name: `🥇 GROUP A ➔ "${nameA}"`,
        value: valA,
        inline: false,
      },
      {
        name: `🥇 GROUP B ➔ "${nameB}"`,
        value: valB,
        inline: false,
      },
      {
        name: '⏳ Sisa Waktu Bidding:',
        value: `${remainingText}\n*(Batas Akhir: Sabtu, 8 Agustus 2026, 20:00 WIB)*`,
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7 • Auto-updated Live System' },
    timestamp: new Date().toISOString(),
  };
}

export async function patchMainBidMessage(msgId: string, data: any, forceClosed: boolean, token: string) {
  const embed = buildMainBidEmbed(data, forceClosed);
  const { isClosed } = getRemainingTimeText();
  const components = getBidButtons(forceClosed || isClosed);

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed], components }),
  });

  return res.ok;
}
