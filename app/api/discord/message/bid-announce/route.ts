import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { KV_BID_KEY, KV_MSG_MAIN_KEY, KV_MSG_LOG_KEY, KV_MSG_NEWS_KEY, BidStore, buildNewsEmbed } from '@/lib/discord/bidding';
import { buildMainBidEmbed } from '@/lib/discord/messages/bidding';
import { buildLogBidPayload } from '@/lib/discord/messages/log-bidding';
import { getBidButtons } from '@/lib/discord/buttons/bidding';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Bot token missing' }, { status: 500 });
    }

    const headers = {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    };

    // 1. Ambil Data Bidding & Status Permanen dari KV
    let dataStore: BidStore | null = await kv.get<BidStore>(KV_BID_KEY);
    if (typeof dataStore === 'string') {
      try { dataStore = JSON.parse(dataStore); } catch {}
    }
    const currentData: BidStore = dataStore || { groupA: null, groupB: null, logs: [] };

    const mainMsgId = await kv.get<string>(KV_MSG_MAIN_KEY);
    const logMsgId = await kv.get<string>(KV_MSG_LOG_KEY);
    const newsMsgId = await kv.get<string>(KV_MSG_NEWS_KEY);

    // Cek apakah lelang sudah pernah ditutup secara permanen di KV
    const isClosedInKv = await kv.get<boolean>('BID_IS_CLOSED');
    
    // Jika di KV sudah ditutup (atau ingin paksa tutup sekarang), isClosed = true
    const isClosed = isClosedInKv ?? true; 

    // Simpan status permanen ke KV
    if (!isClosedInKv) {
      await kv.set('BID_IS_CLOSED', true);
    }

    // 2. PATCH Main Bidding Message (Tombol akan otomatis disabled)
    if (mainMsgId) {
      const mainEmbed = buildMainBidEmbed(currentData, isClosed);
      const components = getBidButtons(isClosed);
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${mainMsgId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ embeds: [mainEmbed], components }),
      });
    }

    // 3. PATCH Log Bidding Message
    if (logMsgId) {
      const logPayload = buildLogBidPayload(currentData.logs || []);
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${logMsgId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(logPayload),
      });
    }

    // 4. PATCH News Message (Teks pengumuman diubah ke status tutup)
    if (newsMsgId) {
      const newsEmbed = buildNewsEmbed(currentData, isClosed);
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_NEWS}/messages/${newsMsgId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          content: '🚨 @everyone **LELANG PENAMAAN DIVISI RESMI DITUTUP!** 🚨\n\nLelang Penamaan Divisi TWI Season 7 telah **RESMI DITUTUP**.\n\nTerima kasih kepada seluruh tim yang telah berpartisipasi! Hasil akhir dapat dilihat di <#856446649940049930>.',
          embeds: [newsEmbed],
          allowed_mentions: { parse: ['everyone'] },
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil mem-PATCH seluruh pesan menjadi CLOSED secara permanen.',
      isClosed,
    });
  } catch (error: any) {
    console.error('Error saat patch close bidding:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
