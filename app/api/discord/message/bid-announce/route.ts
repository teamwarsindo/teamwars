import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { KV_BID_KEY, KV_MSG_MAIN_KEY, KV_MSG_LOG_KEY, BidStore } from '@/lib/discord/bidding';
import { buildMainBidEmbed } from '@/lib/discord/messages/bidding';
import { buildLogBidPayload } from '@/lib/discord/messages/log-bidding';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Batas Akhir Bidding: Minggu, 9 Agustus 2026, 20:00:00 WIB (Timestamp: 1786279200)
const BID_DEADLINE_TIMESTAMP = 1786279200;

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

// Helper khusus embed pengumuman News (Tampilan Nama Bold Tanpa Tag <@>)
function buildNewsEmbed(data: BidStore, isClosed: boolean) {
  const nameA = data?.groupA?.name || 'Belum ada';
  const displayNameA = data?.groupA?.displayName || data?.groupA?.username || 'Belum ada';
  const valA = data?.groupA
    ? `💰 **${formatRupiah(data.groupA.amount)}** oleh **${displayNameA}**`
    : `💰 **Rp 0** oleh _Belum ada_`;

  const nameB = data?.groupB?.name || 'Belum ada';
  const displayNameB = data?.groupB?.displayName || data?.groupB?.username || 'Belum ada';
  const valB = data?.groupB
    ? `💰 **${formatRupiah(data.groupB.amount)}** oleh **${displayNameB}**`
    : `💰 **Rp 0** oleh _Belum ada_`;

  const diffMs = (BID_DEADLINE_TIMESTAMP * 1000) - Date.now();
  let sisaWaktuText = '`Lelang Telah Selesai`';
  if (diffMs > 0 && !isClosed) {
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    sisaWaktuText = hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;
  }

  return {
    title: isClosed ? '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7 (DITUTUP)' : '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7',
    description: isClosed
      ? '❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta.'
      : 'Bidding nama resmi divisi masih terbuka!\nSilakan lakukan penawaran di <#1268233334543224853>.',
    color: isClosed ? 0xed4245 : 0xfee75c,
    fields: [
      { name: `GROUP A ➔ "${nameA}"`, value: valA, inline: false },
      { name: `GROUP B ➔ "${nameB}"`, value: valB, inline: false },
      { name: 'Batas Akhir: Hari Ini, 20:00 WIB', value: `⏳ Sisa Waktu: ${sisaWaktuText}`, inline: false },
      {
        name: '📌 Cara Bidding:',
        value: 'Klik tombol `Bid Group A` atau `Bid Group B` di channel bidding lalu isi nama divisi & nominal bid.',
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
    timestamp: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return NextResponse.json({ error: 'Bot token missing' }, { status: 500 });

    const headers = {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    };

    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const hours = nowWib.getHours();
    const minutes = nowWib.getMinutes();

    let dataStore: BidStore | null = await kv.get<BidStore>(KV_BID_KEY);
    if (typeof dataStore === 'string') {
      try { dataStore = JSON.parse(dataStore); } catch {}
    }
    const currentData: BidStore = dataStore || { groupA: null, groupB: null, logs: [] };

    const mainMsgId = await kv.get<string>(KV_MSG_MAIN_KEY);
    const logMsgId = await kv.get<string>(KV_MSG_LOG_KEY);
    const newsMsgId = await kv.get<string>('twi_bid_msg_news_id');

    const isClosed = Date.now() >= BID_DEADLINE_TIMESTAMP * 1000;

    // 🚨 1. PENGUMUMAN SISA 1 JAM (JAM 19:00 WIB)
    if (hours === 19 && minutes === 0) {
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: '🚨 @everyone **PERINGATAN SISA 1 JAM LAGI!** 🚨\n\nLelang Penamaan Divisi TWI Season 7 akan **RESMI DITUTUP** pada pukul **20:00 WIB** (<t:1786279200:R>).\n\nSegera ajukan penawaran terbaik tim kamu sekarang!',
          allowed_mentions: { parse: ['everyone'] },
        }),
      });
    }

    // 📢 2. BROADCAST ANNOUNCEMENT SAAT PENUTUPAN (JAM 20:00 WIB)
    if (hours === 20 && minutes === 0) {
      const closedEmbed = buildMainBidEmbed(currentData, true);
      const components = getBidButtons(true);

      const resNewMain = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: '🔔 @everyone **LELANG PENAMAAN DIVISI RESMI DITUTUP!**',
          embeds: [closedEmbed],
          components,
          allowed_mentions: { parse: ['everyone'] },
        }),
      });

      const newMainMsg: any = await resNewMain.json();
      if (newMainMsg?.id) await kv.set(KV_MSG_MAIN_KEY, newMainMsg.id);

      return NextResponse.json({ success: true, message: 'Bidding closed.' });
    }

    // 🔄 3. SILENT LIVE UPDATE UNTUK CHANNEL BIDDING & NEWS
    if (mainMsgId) {
      const mainEmbed = buildMainBidEmbed(currentData, isClosed);
      const components = getBidButtons(isClosed);

      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${mainMsgId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ embeds: [mainEmbed], components }),
      });
    }

    if (logMsgId) {
      const logPayload = buildLogBidPayload(currentData.logs || []);
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${logMsgId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(logPayload),
      });
    }

    // 📰 UPDATE PESAN DI CHANNEL NEWS (BEBAS TAG <@>)
    if (newsMsgId) {
      const newsEmbed = buildNewsEmbed(currentData, isClosed);
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_NEWS}/messages/${newsMsgId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ embeds: [newsEmbed] }),
      });
    }

    return NextResponse.json({
      success: true,
      wibTime: `${hours}:${minutes < 10 ? '0' : ''}${minutes}`,
      isClosed,
    });
  } catch (error: any) {
    console.error('Error pada cronbid-announce route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
