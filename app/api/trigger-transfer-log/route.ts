import { NextResponse } from 'next/server';
import { sendTransferNewsLog } from '@/lib/discord/messages/transfer-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Kirim Log OUT: [T] sanmao
    const outLogId = await sendTransferNewsLog({
      teamName: 'TRUE GOD',
      teamKode: 'tgod',
      teamEmojiId: '1534184366140555365',
      teamHex: '#00FFFF',
      action: 'OUT',
      targetIgn: '[T] sanmao',
      oldIdDl: '502-433-116',
    });

    // 2. Kirim Log ADD: [T]Bee
    const addLogId = await sendTransferNewsLog({
      teamName: 'TRUE GOD',
      teamKode: 'tgod',
      teamEmojiId: '1534184366140555365',
      teamHex: '#00FFFF',
      action: 'ADD',
      targetIgn: '[T]Bee',
      newIdDl: '105-662-751',
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer log berhasil dikirim ke channel resmi',
      data: {
        outLogId,
        addLogId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
