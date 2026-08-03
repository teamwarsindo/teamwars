import { NextRequest, NextResponse } from 'next/server';
import { initBiddingMessages, syncBidMessages } from '@/lib/discord/bidding';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bidParam = searchParams.get('bid');

    let overrideStatus: 'closed' | 'open' | undefined = undefined;
    if (bidParam === 'closed') overrideStatus = 'closed';
    if (bidParam === 'open') overrideStatus = 'open';

    // Jika dipanggil via query param, update/init pesan dengan status tersebut
    if (overrideStatus) {
      await initBiddingMessages(overrideStatus);
    } else {
      await initBiddingMessages();
    }

    return NextResponse.json({
      success: true,
      message: `✅ Pesan Bidding berhasil dikirim ke channel (Status: ${overrideStatus || 'Auto Schedule'})!`,
    });
  } catch (error: any) {
    console.error('Gagal mengirim pesan bidding:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim pesan bidding' },
      { status: 500 }
    );
  }
}
