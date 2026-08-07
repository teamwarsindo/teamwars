import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { buildBidEmbeds, patchMainBidMessage, getRemainingTimeText } from '@/lib/discord/messages/bidding';
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

    // 1. AMBIL DATA LEUANG & LOGS DARI REDIS
    let biddingData: any = await kv.get('twi_bidding_data');
    if (typeof biddingData === 'string') {
      try { biddingData = JSON.parse(biddingData); } catch {}
    }
    biddingData = biddingData || {};

    const biddingLogs = Array.isArray(biddingData?.logs) ? biddingData.logs : [];

    // 2. GENERATE EMBED BERSAMA DARI LIB
    const { mainEmbed, newsEmbed, isClosed } = buildBidEmbeds(biddingData);

    // 3. CEK ATURAN WAKTU UNTUK MODE POST (SABTU 07:00 & 19:00 WIB)
    const { searchParams } = new URL(req.url);
    const forcePost = searchParams.get('forcePost') === 'true';

    // Konversi jam server saat ini ke komponen waktu Asia/Jakarta
    const nowWibStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const nowWib = new Date(nowWibStr);
    
    const dayName = nowWib.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' }); // "Sat", "Fri", dll.
    const currentHour = nowWib.getHours(); // 0 - 23

    // POST aktif jika: Sabtu jam 7 pagi (07:xx WIB) ATAU Sabtu jam 7 malam (19:xx WIB) ATAU dipaksa via ?forcePost=true
    const isPostScheduledHour = dayName === 'Sat' && (currentHour === 7 || currentHour === 19);
    const shouldPostNewMessage = isPostScheduledHour || forcePost;

    let newsMsgId = (await kv.get<string>('twi_bid_announce_msg_id')) || (await kv.get<string>('twi:bid_announce_msg_id'));
    let newsStatusAction = '';

    // 4. EKSEKUSI LOGIKA NEWS (#CH_NEWS)
    if (shouldPostNewMessage) {
      // 🟢 MODE POST: Hapus pesan lama jika ada
      if (newsMsgId) {
        await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${newsMsgId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${token}` },
        }).catch(() => null);
      }

      // Kirim pesan news baru dengan @everyone
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

      const newsData = await newsRes.json().catch(() => ({}));
      if (newsRes.ok && newsData?.id) {
        newsMsgId = newsData.id;
        await kv.set('twi_bid_announce_msg_id', newsData.id);
        await kv.set('twi:bid_announce_msg_id', newsData.id);
        newsStatusAction = `Posted New Message (ID: ${newsMsgId})`;
      } else {
        newsStatusAction = 'Failed to POST New Message';
      }
    } else {
      // 🟢 MODE PATCH: Coba perbarui embed pesan lama
      let patchedOk = false;
      if (newsMsgId) {
        const resNews = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${newsMsgId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ embeds: [newsEmbed] }),
        });
        patchedOk = resNews.ok;
      }

      // Fallback: Jika ID tidak ditemukan atau gagal di-PATCH (pesan hilang), posting baru
      if (!patchedOk) {
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

        const newsData = await newsRes.json().catch(() => ({}));
        if (newsRes.ok && newsData?.id) {
          newsMsgId = newsData.id;
          await kv.set('twi_bid_announce_msg_id', newsData.id);
          await kv.set('twi:bid_announce_msg_id', newsData.id);
          newsStatusAction = `Fallback Posted New Message (ID: ${newsMsgId})`;
        } else {
          newsStatusAction = 'Failed / News ID Not Found';
        }
      } else {
        newsStatusAction = `Patched Existing Message (ID: ${newsMsgId})`;
      }
    }

    // 5. UPDATE EMBED BID UTAMA & LOG (#CH_BID)
    const mainBidMsgId = (await kv.get<string>('twi_bid_msg_main_id')) || (await kv.get<string>('twi:bid_msg_main_id'));
    let mainPatched = false;
    if (mainBidMsgId) {
      mainPatched = await patchMainBidMessage(mainBidMsgId, biddingData, isClosed, token);
    }

    const logBidMsgId = (await kv.get<string>('twi_bid_msg_log_id')) || (await kv.get<string>('twi:bid_msg_log_id'));
    let logPatched = false;
    if (logBidMsgId) {
      logPatched = await patchLogBidMessage(logBidMsgId, biddingLogs, token);
    }

    return NextResponse.json({
      success: true,
      message: '⚡ Unified Bid Announce API berhasil dijalankan!',
      mode: shouldPostNewMessage ? 'POST (Schedule / Forced)' : 'PATCH (Routine)',
      status: {
        news: newsStatusAction,
        mainBidPatched: mainPatched ? `Success (ID: ${mainBidMsgId})` : 'Failed / Msg ID Not Found',
        logBidPatched: logPatched ? `Success (ID: ${logBidMsgId})` : 'Failed / Msg ID Not Found',
      },
    });
  } catch (error: any) {
    console.error('Error Unified Bid Announce API:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}