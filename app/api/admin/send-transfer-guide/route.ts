import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Target Channel ID
const TARGET_CHANNEL_ID = '635752052391411712';
// const TARGET_CHANNEL_ID = '1525775643168735344';

const KV_GUIDE_MSG_KEY = 'config:transfer_guide_msg_id';

// Helper untuk format tanggal WIB
function getFormattedWibTimestamp(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
  return `${dateStr} at ${timeStr.replace('.', ':')} WIB`;
}

export async function GET() {
  try {
    const roleDuelistTag = DISCORD_CONFIG.ROLE_DUELIST
      ? `<@&${DISCORD_CONFIG.ROLE_DUELIST}>`
      : '';

    const contentMessage =
      `${roleDuelistTag}\n\n` +
      `📌 **PENTING:**\n` +
      `Slash command \`/transfer\` hanya dapat digunakan oleh **Ketua & Wakil Ketua** di **Channel Tim** masing-masing.`;

    const formattedFooterText = `TWI Season 7 • ${getFormattedWibTimestamp()}`;

    const payload = {
      content: contentMessage,
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
            text: formattedFooterText,
          },
        },
      ],
    };

    const existingMsgId = await kv.get<string>(KV_GUIDE_MSG_KEY);
    let response: any = null;
    let actionType = '';

    if (existingMsgId) {
      try {
        response = await discordAPI(
          `/channels/${TARGET_CHANNEL_ID}/messages/${existingMsgId}`,
          'PATCH',
          payload
        );
        
        // Cek jika response PATCH sukses dan mengembalikan ID
        if (response && response.id) {
          actionType = 'UPDATED (PATCH)';
        } else {
          // Jika PATCH return null (message lama dihapus/tidak ketemu), paksa POST
          response = null;
        }
      } catch (patchErr) {
        response = null;
      }
    }

    // Jika belum ada ID atau PATCH gagal/return null, buat pesan baru (POST)
    if (!response || !response.id) {
      response = await discordAPI(`/channels/${TARGET_CHANNEL_ID}/messages`, 'POST', payload);
      actionType = existingMsgId ? 'RE-CREATED (POST)' : 'CREATED (POST)';
    }

    // Validasi akhir sebelum membaca response.id
    if (!response || !response.id) {
      throw new Error('Gagal mendapatkan respon valid dari Discord API.');
    }

    // Simpan ID pesan terbaru ke KV
    await kv.set(KV_GUIDE_MSG_KEY, response.id);

    return NextResponse.json({
      success: true,
      action: actionType,
      message: `🚀 Embed & Content berhasil di-${actionType.toLowerCase()} ke channel ${TARGET_CHANNEL_ID}!`,
      messageId: response.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim embed.' },
      { status: 500 }
    );
  }
}
