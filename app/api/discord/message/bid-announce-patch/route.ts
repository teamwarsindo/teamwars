import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah, patchMainBidMessage, getRemainingTimeText } from '@/lib/discord/messages/bidding';
import { patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json({ success: false, error: 'Missing BOT TOKEN or Channel Config' }, { status: 500 });
    }

    // 1. AMBIL DATA UTUH REDIS
    let biddingData: any = await kv.get('twi_bidding_data');
    if (typeof biddingData === 'string') {
      try { biddingData = JSON.parse(biddingData); } catch {}
    }
    biddingData = biddingData || {};

    const groupA = biddingData?.groupA;
    const groupB = biddingData?.groupB;
    const biddingLogs = Array.isArray(biddingData?.logs) ? biddingData.logs : [];

    const nameA = groupA?.name ? groupA.name : 'Belum ada';
    const valA = groupA && (groupA.amount || groupA.amount === 0)
      ? `💰 **${formatRupiah(Number(groupA.amount))}** oleh <@${groupA.userId}>`
      : `💰 **Rp 0** oleh _Belum ada_`;

    const nameB = groupB?.name ? groupB.name : 'Belum ada';
    const valB = groupB && (groupB.amount || groupB.amount === 0)
      ? `💰 **${formatRupiah(Number(groupB.amount))}** oleh <@${groupB.userId}>`
      : `💰 **Rp 0** oleh _Belum ada_`;

    // 2. HITUNG SISA WAKTU MANUAL (WIB)
    const { text: remainingText, isClosed } = getRemainingTimeText();

    // 3. MURNI PATCH EMBED NEWS (#CH_NEWS)
    const newsMsgId = (await kv.get<string>('twi_bid_announce_msg_id')) || (await kv.get<string>('twi:bid_announce_msg_id'));
    let newsPatched = false;

    if (newsMsgId) {
      const newsEmbed = {
        title: isClosed ? '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7 (DITUTUP)' : '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7',
        description: isClosed
          ? '❌ **Bidding telah resmi ditutup!** Terima kasih kepada seluruh peserta.'
          : `Bidding nama resmi divisi masih terbuka! Silakan lakukan penawaran di <#${bidChannelId}>.`,
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
          {
            name: '📌 Cara Bidding:',
            value: `Klik tombol **\`[ Bid Group A ]\`** atau **\`[ Bid Group B ]\`** di <#${bidChannelId}> lalu isi nama divisi & nominal bid.`,
            inline: false,
          },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
        timestamp: new Date().toISOString(),
      };

      const resNews = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${newsMsgId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [newsEmbed] }),
      });

      newsPatched = resNews.ok;
    }

    // 4. MURNI PATCH EMBED BIDDING UTAMA (#CH_BID)
    const mainBidMsgId = (await kv.get<string>('twi_bid_msg_main_id')) || (await kv.get<string>('twi:bid_msg_main_id'));
    let mainPatched = false;
    if (mainBidMsgId) {
      mainPatched = await patchMainBidMessage(mainBidMsgId, biddingData, isClosed, token);
    }

    // 5. MURNI PATCH LOG BIDDING (#CH_BID)
    const logBidMsgId = (await kv.get<string>('twi_bid_msg_log_id')) || (await kv.get<string>('twi:bid_msg_log_id'));
    let logPatched = false;
    if (logBidMsgId) {
      logPatched = await patchLogBidMessage(logBidMsgId, biddingLogs, token);
    }

    return NextResponse.json({
      success: true,
      message: '⚡ MURNI PATCH 100%! Seluruh embed di News, Bid Utama, dan Log berhasil di-update tanpa kirim ulang.',
      data: {
        remainingTime: remainingText,
        isClosed,
      },
      status: {
        newsPatched: newsPatched ? `Success (ID: ${newsMsgId})` : 'Failed / Msg ID Not Found',
        mainBidPatched: mainPatched ? `Success (ID: ${mainBidMsgId})` : 'Failed / Msg ID Not Found',
        logBidPatched: logPatched ? `Success (ID: ${logBidMsgId})` : 'Failed / Msg ID Not Found',
      },
    });
  } catch (error: any) {
    console.error('Error Pure Patch API:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
