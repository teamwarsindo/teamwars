import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Target Channel ID & Key Penyimpanan KV
// const TARGET_CHANNEL_ID = '635752052391411712';
const TARGET_CHANNEL_ID = '1525775643168735344';
const KV_GUIDE_MSG_KEY = 'config:transfer_guide_msg_id';

export async function GET() {
  try {
    const roleDuelistTag = DISCORD_CONFIG.ROLE_DUELIST
      ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>`
      : '';

    const payload = {
      content: roleDuelistTag ? `${roleDuelistTag}` : undefined,
      embeds: [
        {
          title: '📋 TRANSFER REQUEST',
          description:
            '**📌 Aturan Main:**\n' +
            '• **Season Transfer:**\n' +
            '  └ *Free Agent:* Bebas direkrut tanpa batasan kuota.\n' +
            '  └ *Transfer Antar Tim:* Maksimal **2 pemain** per tim.\n' +
            '  └ *Batas Pemain:* Maksimal membela **2 tim** berbeda dalam 1 musim.\n' +
            '• **Playoffs Transfer:**\n' +
            '  └ Roster di-*lock* (Dilarang merekrut pemain dari tim lain).\n' +
            '  └ Hanya diizinkan merekrut *Free Agent*.\n' +
            '• **Waktu Pemrosesan:**\n' +
            '  └ Instan selama bot bekerja.\n\n' +
            '──────────',
          color: hexToDecimal('#3498db'),
          fields: [
            {
              name: '📥 Tambah Pemain',
              value:
                '• **Command:** `/transfer add user:@username ign:NamaIGN id_dl:123456789`\n' +
                '• **Ketentuan:**\n' +
                '  └ Roster maksimal **10 pemain**.\n' +
                '  └ ID Game wajib **9 digit angka**.',
              inline: false,
            },
            {
              name: '📤 Kurangi Pemain',
              value:
                '• **Command:** `/transfer out user:@username`\n' +
                '• **Ketentuan:**\n' +
                '  └ Roster minimal tersisa **5 pemain**.\n' +
                '  └ Ketua/Wakil wajib memindahkan jabatan terlebih dahulu.',
              inline: false,
            },
            {
              name: '⚙️ Perbarui ID Duel Links / Jabatan',
              value:
                '• **Ganti ID Game:**\n' +
                '  └ **Command:** `/transfer edit user:@username new_id_dl:123456789`\n' +
                '  └ *Ketentuan:* Memakan 1x kuota transfer.\n' +
                '• **Ganti Jabatan:**\n' +
                '  └ **Command:** `/transfer edit user:@username position:Wakil Ketua`',
              inline: false,
            },
          ],
          footer: {
            text: 'Team Wars Indonesia System • Gunakan fitur ini dengan bijak.',
          },
        },
      ],
    };

    const existingMsgId = await kv.get<string>(KV_GUIDE_MSG_KEY);
    let response: any;
    let actionType = '';

    if (existingMsgId) {
      try {
        response = await discordAPI(
          `/channels/${TARGET_CHANNEL_ID}/messages/${existingMsgId}`,
          'PATCH',
          payload
        );
        actionType = 'UPDATED (PATCH)';
      } catch (patchErr) {
        response = await discordAPI(`/channels/${TARGET_CHANNEL_ID}/messages`, 'POST', payload);
        actionType = 'RE-CREATED (POST)';
      }
    } else {
      response = await discordAPI(`/channels/${TARGET_CHANNEL_ID}/messages`, 'POST', payload);
      actionType = 'CREATED (POST)';
    }

    if (response?.id) {
      await kv.set(KV_GUIDE_MSG_KEY, response.id);
    }

    return NextResponse.json({
      success: true,
      action: actionType,
      message: `🚀 Embed berhasil di-${actionType.toLowerCase()} ke channel ${TARGET_CHANNEL_ID}!`,
      messageId: response.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim embed.' },
      { status: 500 }
    );
  }
}
