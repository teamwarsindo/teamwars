import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah, patchMainBidMessage } from '@/lib/discord/messages/bidding';
import { patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export const dynamic = 'force-dynamic';

// 🟢 PERBAIKAN TIMESTAMP: Sabtu, 8 Agustus 2026, 20:00:00 WIB (13:00 UTC)
const BID_DEADLINE_TIMESTAMP = 1786069200;

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json({ success: false, error: 'Missing BOT TOKEN or Channel Config' }, { status: 500 });
    }

    // 1. AMBIL DATA UTUH DARI REDIS
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

    // 2. HAPUS PESAN ANNOUNCEMENT LAMA DI CHANNEL #NEWS
    const oldNewsMsgId = (await kv.get<string>('twi_bid_announce_msg_id')) || (await kv.get<string>('twi:bid_announce_msg_id'));
    if (oldNewsMsgId) {
      await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${oldNewsMsgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${token}` },
      }).catch(() => null);
    }

    // 3. EMBED PENGUMUMAN BARU FOR #NEWS
    const newsEmbed = {
      title: '🏆 LELANG PENAMAAN DIVISI TWI SEASON 7',
      description: `Bidding nama resmi divisi masih terbuka! Silakan lakukan penawaran di <#${bidChannelId}>.`,
      color: 0xfee75c,
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
          value: `<t:${BID_DEADLINE_TIMESTAMP}:R>\n*(Batas Akhir: Sabtu, 8 Agustus 2026, 20:00 WIB)*`,
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

    // 4. KIRIM PESAN BARU KE #NEWS
    const newsRes = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: '@everyone',
        embeds: [newsEmbed],
      }),
    });

    // 🟢 SAFE PARSING JSON RESPON DISCORD
    const newsText = await newsRes.text();
    let newsData: any = {};
    try {
      newsData = JSON.parse(newsText);
    } catch {
      console.error('Response bukan JSON:', newsText);
    }

    if (!newsRes.ok) {
      console.error('Gagal kirim pengumuman bidding ke #news:', newsData);
      return NextResponse.json({ success: false, error: newsData || newsText }, { status: newsRes.status });
    }

    if (newsData?.id) {
      await kv.set('twi_bid_announce_msg_id', newsData.id);
      await kv.set('twi:bid_announce_msg_id', newsData.id);
    }

    // 5. EMBED UTAMA & LOG UPDATE
    const mainBidMsgId = (await kv.get<string>('twi_bid_msg_main_id')) || (await kv.get<string>('twi:bid_msg_main_id'));
    if (mainBidMsgId) {
      await patchMainBidMessage(mainBidMsgId, biddingData, false, token).catch(() => null);
    }

    const logBidMsgId = (await kv.get<string>('twi_bid_msg_log_id')) || (await kv.get<string>('twi:bid_msg_log_id'));
    if (logBidMsgId) {
      await patchLogBidMessage(logBidMsgId, biddingLogs, token).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: '✅ Pengumuman news berhasil diperbarui dan embed bidding/log ter-update!',
      newsMessageId: newsData?.id,
    });
  } catch (error: any) {
    console.error('Error Bid Announce API:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
      }
