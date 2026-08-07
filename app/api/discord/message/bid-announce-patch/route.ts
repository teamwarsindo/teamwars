import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah, patchMainBidMessage } from '@/lib/discord/messages/bidding';
import { patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export const dynamic = 'force-dynamic';

// 🟢 FIX TIMESTAMP: Sabtu, 8 Agustus 2026, 20:00:00 WIB (13:00 UTC)
const BID_DEADLINE_TIMESTAMP = 1786069200;

export async function GET(req: NextRequest) {
  try {
    // 1. OTENTIKASI CRONJOB (OPSIONAL / KEAMANAN ENDPOINT)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Jika CRON_SECRET di-set di .env, pastikan Bearer token sesuai (Vercel Cron otomatis kirim ini)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Izinkan bypass jika dibuka dengan param ?admin=tsaqif
      const { searchParams } = new URL(req.url);
      if (searchParams.get('admin') !== 'tsaqif') {
        return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
      }
    }

    const token = process.env.DISCORD_BOT_TOKEN;
    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json({ success: false, error: 'Missing BOT TOKEN or Channel Config' }, { status: 500 });
    }

    // 2. AMBIL DATA BIDDING UTUH DARI REDIS (KEY: twi_bidding_data)
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

    // Cek apakah lelang sudah lewat batas deadline
    const nowUnix = Math.floor(Date.now() / 1000);
    const isClosed = nowUnix >= BID_DEADLINE_TIMESTAMP;

    // 3. SUSUN EMBED NEWS (#CH_NEWS)
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
          value: isClosed
            ? '`Lelang Telah Selesai`'
            : `<t:${BID_DEADLINE_TIMESTAMP}:R>\n*(Batas Akhir: Sabtu, 8 Agustus 2026, 20:00 WIB)*`,
          inline: false,
        },
        {
          name: '📌 Cara Bidding:',
          value: `Klik tombol **\`[ Bid Group A ]\`** atau **\`[ Bid Group B ]\`** di <#${bidChannelId}> lalu isi nama divisi & nominal bid.`,
          inline: false,
        },
      ],
      footer: { text: 'Team Wars Indonesia Season 7 • Auto-updated Cron' },
      timestamp: new Date().toISOString(),
    };

    // 4. MURNI PATCH PESAN ANNOUNCEMENT DI #NEWS (FALLBACK SEND JIKA CH/MSG HILANG)
    let newsMsgId = (await kv.get<string>('twi_bid_announce_msg_id')) || (await kv.get<string>('twi:bid_announce_msg_id'));
    let newsPatched = false;

    if (newsMsgId) {
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

    // Jika belum pernah dikirim atau ID pesan lama di-delete manual di Discord, buat baru (POST)
    if (!newsPatched) {
      const resNewSend = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
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

      if (resNewSend.ok) {
        const sendData = await resNewSend.json();
        newsMsgId = sendData.id;
        await kv.set('twi_bid_announce_msg_id', sendData.id);
        await kv.set('twi:bid_announce_msg_id', sendData.id);
        newsPatched = true;
      }
    }

    // 5. PATCH EMBED UTAMA BIDDING (#CH_BID)
    const mainBidMsgId = (await kv.get<string>('twi_bid_msg_main_id')) || (await kv.get<string>('twi:bid_msg_main_id'));
    let mainPatched = false;
    if (mainBidMsgId) {
      mainPatched = await patchMainBidMessage(mainBidMsgId, biddingData, isClosed, token);
    }

    // 6. PATCH EMBED LOG BIDDING (#CH_BID)
    const logBidMsgId = (await kv.get<string>('twi_bid_msg_log_id')) || (await kv.get<string>('twi:bid_msg_log_id'));
    let logPatched = false;
    if (logBidMsgId) {
      logPatched = await patchLogBidMessage(logBidMsgId, biddingLogs, token);
    }

    return NextResponse.json({
      success: true,
      message: '⚡ Cronjob PATCH Berhasil! Embed News, Bid Utama, dan Log telah diperbarui.',
      timestamp: new Date().toISOString(),
      data: {
        groupA: { name: nameA, amount: groupA?.amount || 0 },
        groupB: { name: nameB, amount: groupB?.amount || 0 },
        totalLogs: biddingLogs.length,
        isClosed,
      },
      status: {
        newsPatched: newsPatched ? `Success (ID: ${newsMsgId})` : 'Failed / Channel Error',
        mainBidPatched: mainPatched ? `Success (ID: ${mainBidMsgId})` : 'Failed / Msg ID Not Found',
        logBidPatched: logPatched ? `Success (ID: ${logBidMsgId})` : 'Failed / Msg ID Not Found',
      },
    });
  } catch (error: any) {
    console.error('Error Cron Patch API:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
  
