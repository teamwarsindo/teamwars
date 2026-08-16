import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Channel ID: ambil dari query params atau env channel score
    const channelId = searchParams.get('channelId') || process.env.DISCORD_CH_SCORE_ID || process.env.DISCORD_CH_SCHEDULE_RESULTS;
    const messageId = searchParams.get('messageId') || '1538689252278140950';

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID tidak ditemukan. Masukkan ?channelId=ID_CHANNEL di query URL' },
        { status: 400 }
      );
    }

    // 1. Ambil detail pesan saat ini untuk mengambil emoji asli yang terpasang
    const currentMsg = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'GET').catch(() => null);

    let winnerDisplay = '**DS SAKURAJIMA**';
    let loserDisplay = '**Supernova**';

    // Coba ekstrak format emoji jika ada dari pesan yang ada
    if (currentMsg?.embeds?.[0]?.description) {
      const desc = currentMsg.embeds[0].description;
      // Format deskripsi lama: "<emojiA> DS SAKURAJIMA [ 10 - 8 ] <emojiB> Supernova"
      const match = desc.match(/(<:[^:]+:\d+>|<a:[^:]+:\d+>)?\s*DS SAKURAJIMA.*?(<:[^:]+:\d+>|<a:[^:]+:\d+>)?\s*Supernova/i);
      if (match) {
        const emojiSakurajima = match[1] || '';
        const emojiSupernova = match[2] || '';
        winnerDisplay = `${emojiSakurajima ? emojiSakurajima + ' ' : ''}**DS SAKURAJIMA**`;
        loserDisplay = `${emojiSupernova ? emojiSupernova + ' ' : ''}**Supernova**`;
      }
    }

    // 2. Format embed baru (hijau template standar)
    const fixedPayload = {
      embeds: [
        {
          description: `${winnerDisplay} defeated ${loserDisplay}\nwith a score of **10-8**`,
          color: 0x22c55e,
        },
      ],
    };

    // 3. Eksekusi PATCH untuk update pesan
    const updated = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'PATCH', fixedPayload);

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil diperbaiki sesuai template!',
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
