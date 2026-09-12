import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Data target kasus pelepasan Nanika
    const teamSlug = 'licht-united';
    const targetIgn = 'Nanika';
    const idDuelLinks = '894-782-054';

    // 1. Ambil identitas tim dari KV (Warna & Emoji)
    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData) {
      return NextResponse.json(
        { error: `Data tim dengan slug "${teamSlug}" tidak ditemukan di database!` },
        { status: 404 }
      );
    }

    const teamName = teamData.namaTim || 'LICHT UNITED';
    const teamKode = teamData.kodeTim;
    const teamEmojiId = teamData.emojiId || teamData.discordEmojiId;
    const teamHex = teamData.warna || '#ff0000';

    // 2. Format Emoji & Teks
    const emojiPrefix = teamEmojiId ? `<:${teamKode || 'team'}:${teamEmojiId}> ` : '';
    const textContent = `**${targetIgn}** (${idDuelLinks}) telah dikeluarkan dari roster tim ${emojiPrefix}**${teamName}**`;

    // 3. Kirim ke Channel #transfer-news
    const targetChannelId = DISCORD_CONFIG.CH_LOG_TRANSFER;
    if (!targetChannelId) {
      return NextResponse.json(
        { error: 'CH_LOG_TRANSFER belum dikonfigurasi!' },
        { status: 500 }
      );
    }

    const payload = {
      embeds: [
        {
          description: textContent,
          color: hexToDecimal(teamHex),
        },
      ],
    };

    const res = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', payload);

    return NextResponse.json({
      success: true,
      message: '✅ Berhasil dikirim ke channel #transfer-news!',
      discordMessageId: res?.id,
      sentContent: textContent,
      teamColorHex: teamHex,
    });
  } catch (error: any) {
    console.error('Error Resend Transfer:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
