import { DISCORD_CONFIG } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

// Timestamp Unix: Batas Bidding (Minggu, 9 Agustus 2026 20:00:00 WIB = 1786280400)
const BID_DEADLINE_TIMESTAMP = 1786280400;

/**
 * Helper menghitung sisa waktu presisi zona waktu Asia/Jakarta (WIB)
 */
export function getRemainingTimeString(): string {
  // 1. Ambil Waktu Sekarang di WIB
  const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

  // 2. Tentukan Target Hari Ini Jam 20:00:00 WIB
  const targetWib = new Date(nowWib);
  targetWib.setHours(20, 0, 0, 0);

  // 3. Hitung Selisih Millisecond
  const diffMs = targetWib.getTime() - nowWib.getTime();

  if (diffMs <= 0) return '`Lelang Telah Selesai`';

  // 4. Konversi ke Total Detik & Menit (Pembulatan Matematika Tepat)
  const totalSeconds = Math.round(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} jam ${minutes} menit`;
  } else if (hours > 0) {
    return `${hours} jam`;
  } else {
    return `${minutes} menit`;
  }
}

export function buildMainBidEmbed(data: any, isClosed: boolean = false) {
  const statusTitle = isClosed ? '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7 (DITUTUP)' : '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7';
  const statusDesc = isClosed
    ? '❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta.'
    : 'Klik tombol di bawah untuk mengajukan penawaran nama divisi.';

  // Format Group A
  const groupA = data?.groupA;
  const valA = groupA
    ? `💰 **${formatRupiah(groupA.amount)}** oleh <@${groupA.userId}>`
    : `💰 **Rp 0** oleh _Belum ada_`;
  const nameA = groupA?.name ? groupA.name : 'Belum ada';

  // Format Group B
  const groupB = data?.groupB;
  const valB = groupB
    ? `💰 **${formatRupiah(groupB.amount)}** oleh <@${groupB.userId}>`
    : `💰 **Rp 0** oleh _Belum ada_`;
  const nameB = groupB?.name ? groupB.name : 'Belum ada';

  const sisaWaktuText = isClosed ? '`Lelang Telah Selesai`' : `⏳ Sisa Waktu: ${getRemainingTimeString()}`;

  return {
    title: statusTitle,
    description: statusDesc,
    color: isClosed ? 0xed4245 : 0xfee75c,
    fields: [
      {
        name: `GROUP A ➔ "${nameA}"`,
        value: valA,
        inline: false,
      },
      {
        name: `GROUP B ➔ "${nameB}"`,
        value: valB,
        inline: false,
      },
      {
        name: 'Batas Akhir: Hari Ini, 20:00 WIB',
        value: sisaWaktuText,
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7 • Auto-updated Live System' },
    timestamp: new Date().toISOString(),
  };
}

export async function patchMainBidMessage(msgId: string, data: any, isClosed: boolean, token: string) {
  const embed = buildMainBidEmbed(data, isClosed);
  const components = getBidButtons(isClosed);

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed], components }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Gagal update pesan utama Bidding:', err);
  }

  return res.ok;
}