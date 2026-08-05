import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah, patchMainBidMessage } from '@/lib/discord/messages/bidding';
import { patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export const dynamic = 'force-dynamic';

const BID_DEADLINE_TIMESTAMP = 1786107600; // Sabtu, 8 Agustus 2026, 20:00 WIB

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json({ success: false, error: 'Missing BOT TOKEN or Channel Config' }, { status: 500 });
    }

    // 1. AMBIL DATA BIDDING TERBARU DAN LOG DARI REDIS
    const biddingData = (await kv.get<any>('twi:bidding_data')) || {};
    const biddingLogs = (await kv.get<Array<any>>('twi:bidding_logs')) || [];

    const groupA = biddingData?.groupA;
    const groupB = biddingData?.groupB;

    const valA = groupA ? `💰 **${formatRupiah(groupA.amount)}** oleh <@${groupA.userId}>` : `💰 **Rp 0** oleh _Belum ada_`;
    const nameA = groupA?.name ? groupA.name : 'Belum ada';

    const valB = groupB ? `💰 **${formatRupiah(groupB.amount)}** oleh <@${groupB.userId}>` : `💰 **Rp 0** oleh _Belum ada_`;
    const nameB = groupB?.name ? groupB.name : 'Belum ada';

    // 2. CEK DAN HAPUS PESAN ANNOUNCEMENT LAMA DI CHANNEL #NEWS
    const oldNewsMsgId = await kv.get<string>('twi:bid_announce_msg_id');
    if (oldNewsMsgId) {
      await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${oldNewsMsgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${token}` },
      }).catch(() => null);
    }

    // 3. SUSUN EMBED PENGUMUMAN UNTUK #NEWS (MIRIP EMBED BIDDING UTAMA)
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

    // 4. KIRIM PESAN PENGUMUMAN BARU KE #NEWS
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

    const newsData = await newsRes.json();

    if (!newsRes.ok) {
      console.error('Gagal kirim pengumuman bidding ke #news:', newsData);
      return NextResponse.json({ success: false, error: newsData }, { status: newsRes.status });
    }

    // Simpan ID pesan pengumuman baru ke Redis
    if (newsData?.id) {
      await kv.set('twi:bid_announce_msg_id', newsData.id);
    }

    // 5. EMBED UTAMA & LOG LEPAS UPDATE (#CH_BID)
    const mainBidMsgId = await kv.get<string>('twi:bid_msg_main_id');
    if (mainBidMsgId) {
      await patchMainBidMessage(mainBidMsgId, biddingData, false, token);
    }

    const logBidMsgId = await kv.get<string>('twi:bid_msg_log_id');
    if (logBidMsgId) {
      await patchLogBidMessage(logBidMsgId, biddingLogs, token);
    }

    return NextResponse.json({
      success: true,
      message: '✅ Pengumuman news berhasil diperbarui dan embed bidding/log ter-update!',
      newsMessageId: newsData.id,
    });
  } catch (error: any) {
    console.error('Error Bid Announce API:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}