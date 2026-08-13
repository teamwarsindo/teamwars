import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Target Channel ID & Key Penyimpanan KV
// const TARGET_CHANNEL_ID = '635752052391411712';
const TARGET_CHANNEL_ID = '1525775643168735344';
const KV_GUIDE_MSG_KEY = 'config:transfer_guide_msg_id';

export async function GET() {
  try {
    const payload = {
      embeds: [
        {
          title: 'TRANSFER REQUEST',
          description:
            '**ATURAN MAIN:**\n' +
            '• **Season Transfer:** Bebas rekruit *Free Agent*. Transfer antar tim maks. **2 pemain** & pemain maks. membela **2 tim** per musim.\n' +
            '• **Playoffs Transfer:** Roster di-*lock*. Dilarang ambil pemain dari tim lain (Hanya *Free Agent*).\n' +
            '• **Waktu Pemrosesan:** Instan selama bot bekerja.\n\n' +
            '*Catatan:* ***Free Agent*** *(Belum main di Season 7)* | ***Free Duelist*** *(Pernah main di tim lain S7)*',
          color: hexToDecimal('#3498db'),
          fields: [
            {
              name: '➕ Tambah Pemain',
              value: '`/transfer add user:@username ign:NamaIGN id_dl:123456789`\n• Maks. roster 10 pemain & ID Game wajib 9 digit.',
              inline: false,
            },
            {
              name: '➖ Kurangi Pemain',
              value: '`/transfer out user:@username`\n• Min. roster 5 pemain. Ketua/Wakil pindahkan jabatan dulu.',
              inline: false,
            },
            {
              name: '🛠️ Perbarui ID Duel Links / Jabatan',
              value:
                '• **Ganti ID Game:** `/transfer edit user:@username new_id_dl:123456789` *(Memakan 1x Kuota)*\n' +
                '• **Ganti Jabatan:** `/transfer edit user:@username position:Wakil Ketua`',
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
  
