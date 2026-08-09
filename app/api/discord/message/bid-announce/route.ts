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

    // 1. Dapatkan Waktu Sekarang di Zona WIB (Asia/Jakarta)
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const hours = nowWib.getHours();
    const minutes = nowWib.getMinutes();

    // 2. Ambil Data Bidding & Message ID dari KV
    let dataStore: BidStore | null = await kv.get<BidStore>(KV_BID_KEY);
    if (typeof dataStore === 'string') {
      try { dataStore = JSON.parse(dataStore); } catch {}
    }
    const currentData: BidStore = dataStore || { groupA: null, groupB: null, logs: [] };

    const mainMsgId = await kv.get<string>(KV_MSG_MAIN_KEY);
    const logMsgId = await kv.get<string>(KV_MSG_LOG_KEY);

    const isClosed = Date.now() >= BID_DEADLINE_TIMESTAMP * 1000;

    // 🚨 3. PENGUMUMAN KHUSUS JAM 19:00 WIB (SISA 1 JAM LAGI)
    if (hours === 19 && minutes === 0) {
      await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: '🚨 @everyone **PERINGATAN SISA 1 JAM LAGI!** 🚨\n\nLelang Penamaan Divisi TWI Season 7 akan **RESMI DITUTUP** pada pukul **20:00 WIB** (<t:1786279200:R>).\n\nSegera ajukan penawaran terbaik tim kamu sekarang sebelum lelang berakhir!',
          allowed_mentions: { parse: ['everyone'] },
        }),
      });
    }

    // 📢 4. BROADCAST ANNOUNCEMENT DI JAM SPESIFIK (Misal Jam 11:20 WIB atau Jam 20:00 WIB)
    // Jika jam 20:00 WIB (Selesai), kirim pengumuman penutupan baru dengan mention @everyone
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
      if (newMainMsg?.id) {
        await kv.set(KV_MSG_MAIN_KEY, newMainMsg.id);
      }

      return NextResponse.json({ success: true, message: 'Bidding closed and announced.' });
    }

    // 🔄 5. SILENT LIVE UPDATE (Perbarui Embed yang Sudah Ada Tanpa Tag Mention)
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
