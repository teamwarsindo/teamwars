import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET() {
  try {
    const channelId = '1533867924824133773';
    const messageId = '1538689252278140950';

    // Emoji asli server Team Wars Indonesia
    const emojiSakurajima = '<:dss:1534184335085797567>';
    const emojiSupernova = '<:spv:1534184358368514080>';

    const fixedPayload = {
      embeds: [
        {
          description: `${emojiSakurajima} **DS SAKURAJIMA** defeated ${emojiSupernova} **Supernova**\nwith a score of **10-8**`,
          color: 0x22c55e,
        },
      ],
    };

    const updated = await discordAPI(
      `/channels/${channelId}/messages/${messageId}`,
      'PATCH',
      fixedPayload
    );

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil diperbaiki dengan format dan emoji yang presisi!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error fixing score message:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbaiki pesan discord' },
      { status: 500 }
    );
  }
}
