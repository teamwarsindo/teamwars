import { DISCORD_CONFIG } from '@/lib/config';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

// 🟢 HELPER HITUNG SISA WAKTU PRESISI (Toleran terhadap delay cronjob beberapa detik)
export function getRemainingTimeText(): { text: string; isClosed: boolean } {
  // Target Bidding: Sabtu, 8 Agustus 2026, 20:00:00 WIB
  const targetTime = new Date('2026-08-08T20:00:00+07:00').getTime();

  // Ambil waktu persis saat request di-hit di server
  const nowWibString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const nowWibMs = new Date(nowWibString).getTime();

  const diffMs = targetTime - nowWibMs;

  if (diffMs <= 0) {
    return { text: '`Lelang Telah Resmi Ditutup`', isClosed: true };
  }

  // Pembulatan menit terdekat agar delay 5-13 detik dari cronjob tidak mengurangi angka menit
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.round(totalSeconds / 60);

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Hari`);
  if (hours > 0) parts.push(`${hours} Jam`);
  parts.push(`${minutes} Menit`);

  return {
    text: parts.join(' '),
    isClosed: false,
  };
}

// 🟢 GENERATE EMBED UTAMA & NEWS (SYNCHRONOUS MURNI)
export function buildBidEmbeds(data: any, forceClosed: boolean = false) {
  const { text: remainingText, isClosed: timeIsClosed } = getRemainingTimeText();
  const isClosed = forceClosed || timeIsClosed;

  const groupA = data?.groupA;
  const valA = groupA && (groupA.amount || groupA.amount === 0)
    ? `💰 **${formatRupiah(Number(groupA.amount))}** oleh <@${groupA.userId}>`
    : `💰 **Rp 0** oleh _Belum ada_`;
  const nameA = groupA?.name ? groupA.name : 'Belum ada';

  const groupB = data?.groupB;
  const valB = groupB && (groupB.amount || groupB.amount === 0)
    ? `💰 **${formatRupiah(Number(groupB.amount))}** oleh <@${groupB.userId}>`
    : `💰 **Rp 0** oleh _Belum ada_`;
  const nameB = groupB?.name ? groupB.name : 'Belum ada';

  const commonFields = [
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
      name: '⏳ Batas Bidding : Sabtu, 8 Aug 2026, 20:00 WIB',
      value: isClosed ? '`Lelang Telah Resmi Ditutup`' : `Sisa Waktu : **${remainingText}**`,
      inline: false,
    },
  ];

  const mainEmbed = {
    title: isClosed ? '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7 (DITUTUP)' : '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7',
    description: isClosed
      ? '❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta.'
      : 'Klik tombol di bawah untuk mengajukan penawaran nama divisi.',
    color: isClosed ? 0xed4245 : 0xfee75c,
    fields: commonFields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const newsEmbed = {
    ...mainEmbed,
    description: isClosed
      ? '❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta.'
      : `Bidding nama resmi divisi masih terbuka! Silakan lakukan penawaran di <#${DISCORD_CONFIG.CH_BID}>.`,
    fields: [
      ...commonFields,
      {
        name: '📌 Cara Bidding:',
        value: `Klik tombol **\`[ Bid Group A ]\`** atau **\`[ Bid Group B ]\`** di <#${DISCORD_CONFIG.CH_BID}> lalu isi nama divisi & nominal bid.`,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  return { mainEmbed, newsEmbed, isClosed };
}

// 🟢 PATCH UTAMA
export async function patchMainBidMessage(msgId: string, data: any, forceClosed: boolean, token: string) {
  const { mainEmbed, isClosed } = buildBidEmbeds(data, forceClosed);
  const components = getBidButtons(isClosed);

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [mainEmbed], components }),
  });

  return res.ok;
}

// 🟢 PATCH NEWS
export async function patchNewsBidMessage(msgId: string, data: any, forceClosed: boolean, token: string) {
  const { newsEmbed } = buildBidEmbeds(data, forceClosed);

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_NEWS}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [newsEmbed] }),
  });

  return res.ok;
}
