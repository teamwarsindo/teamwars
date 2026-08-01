import { NextResponse } from 'next/server';
import { initBiddingMessages } from '@/lib/discord/bidding';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await initBiddingMessages(process.env);

    return NextResponse.json({
      success: true,
      message: '✅ Pesan Bidding berhasil dikirim ke channel!',
    });
  } catch (error: any) {
    console.error('Gagal mengirim pesan bidding:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal mengirim pesan bidding',
      },
      { status: 500 }
    );
  }
}
