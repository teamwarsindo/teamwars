import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah, patchMainBidMessage } from '@/lib/discord/messages/bidding';
import { patchLogBidMessage } from '@/lib/discord/messages/log-bidding';

export const dynamic = 'force-dynamic';

// Batas Waktu Akhir Bidding: Hari Ini (Minggu, 9 Agustus 2026, 20:00 WIB)
const BID_DEADLINE_TIMESTAMP = 1786280400;

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json({ success: false, error: 'Missing BOT TOKEN or Channel Config' }, { status: 500 });
    }

    // 1. CEK WAKTU SEKARANG (WIB / Asia/Jakarta)
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentHour = nowWib.getHours();
    const currentMinute = nowWib.getMinutes();

    // Aktifkan mode ANNOUNCE FULL (@everyone + Re-post) jika dipanggil di jam 12:00 atau 20:00 WIB
    const isScheduledAnnounceTime = (currentHour === 12 || currentHour === 20) && currentMinute < 10;
    
    // Otomatis TUTUP lelang jika waktu sudah mencapai/melewati jam 20:00 WIB
    const isClosed = currentHour >= 20;

    // 2. AMBIL DATA BIDDING UTUH DARI REDIS
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

    // 3. SUSUN EMBED PENGUMUMAN #NEWS
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
            : `<t:${BID_DEADLINE_TIMESTAMP}:R>\n*(Batas Akhir: Hari Ini, 9 Agustus 2026, 20:00 WIB)*`,
          inline: false,
        },
        {
          name: '📌 Cara Bidding:',
          value: isClosed
            ? 'Pendaftaran penawaran telah ditutup.'
            : `Klik tombol **\`[ Bid Group A ]\`** atau **\`[ Bid Group B ]\`** di <#${bidChannelId}> lalu isi nama divisi & nominal bid.`,
          inline: false,
        },
      ],
      footer: { text: 'Team Wars Indonesia Season 7' },
      timestamp: new Date().toISOString(),
    };

    let newsMessageId = (await kv.get<string>('twi_bid_announce_msg_id')) || (await kv.get<string>('twi:bid_announce_msg_id'));
    let actionTypeUsed = 'PATCH_ONLY';

    // 4. EKSEKUSI A: MODE DELETE + POST (@everyone) DI JAM 12 SIANG & 8 MALAM
    if (isScheduledAnnounceTime || !newsMessageId) {
      actionTypeUsed = 'FULL_ANNOUNCE_POST';

      // Hapus pesan lama jika ada
      if (newsMessageId) {
        await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${newsMessageId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${token}` },
        }).catch(() => null);
      }

      // Kirim pesan baru dengan tag @everyone
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
      if (newsRes.ok && newsData?.id) {
        newsMessageId = newsData.id;
        await kv.set('twi_bid_announce_msg_id', newsData.id);
        await kv.set('twi:bid_announce_msg_id', newsData.id);
      }
    } 
    // 5. EKSEKUSI B: MODE PATCH (SILENT LIVE UPDATE)
    else {
      await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages/${newsMessageId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [newsEmbed] }),
      }).catch(() => null);
    }

    // 6. UPDATE EMBED UTAMA & LOG LEPAS (#CH_BID)
    const mainBidMsgId = (await kv.get<string>('twi_bid_msg_main_id')) || (await kv.get<string>('twi:bid_msg_main_id'));
    if (mainBidMsgId) {
      await patchMainBidMessage(mainBidMsgId, biddingData, isClosed, token);
    }

    const logBidMsgId = (await kv.get<string>('twi_bid_msg_log_id')) || (await kv.get<string>('twi:bid_msg_log_id'));
    if (logBidMsgId) {
      await patchLogBidMessage(logBidMsgId, biddingLogs, token);
    }

    return NextResponse.json({
      success: true,
      mode: actionTypeUsed,
      isClosed,
      message: isClosed
        ? '🏆 Bidding resmi DITUTUP. Seluruh embed diperbarui!'
        : `⚡ Bidding update sukses (${actionTypeUsed})!`,
      newsMessageId,
    });
  } catch (error: any) {
    console.error('Error Hybrid Bid Announce API:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}