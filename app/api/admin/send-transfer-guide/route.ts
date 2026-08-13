import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Target Channel ID (Channel lama di-comment out)
// const TARGET_CHANNEL_ID = '635752052391411712';
const TARGET_CHANNEL_ID = '1525775643168735344';

const KV_GUIDE_MSG_KEY = 'config:transfer_guide_msg_id';

export async function GET() {
  try {
    const payload = {
      embeds: [
        {
          title: '🔄 PANDUAN USAGE SLASH COMMAND `/TRANSFER`',
          description:
            'Gunakan command `/transfer` untuk mengelola *roster* tim, merubah ID game, atau mengatur jabatan kepemimpinan.\n\n📌 *Setiap tim memiliki batas maksimal **2x kuota transfer/perubahan** per musim.*',
          color: hexToDecimal('#3498db'),
          fields: [
            {
              name: '📤 1. KELUARKAN PEMAIN (OUT)',
              value:
                '`/transfer out [user]`\n• **Fungsi:** Mengeluarkan pemain dari roster tim.\n• **Syarat:** Sisa roster minimal **5 pemain**.\n• **Catatan:** Ketua & Wakil Ketua tidak bisa langsung di-*out*. Pindahkan jabatan terlebih dahulu.\n• **Dampak:** Role tim terlepas, server nickname di-reset, dan pemain menjadi *Free Agent*.',
              inline: false,
            },
            {
              name: '📥 2. TAMBAH PEMAIN BARU (ADD)',
              value:
                '`/transfer add [user] [ign] [id_dl]`\n• **Fungsi:** Memasukkan pemain baru ke dalam roster.\n• **Syarat:** Maksimal **10 pemain** per tim & ID Duel Links wajib 9 digit angka.\n• **Dampak:** Otomatis memberikan Role Tim, Role Duelist, Role Verified, dan mengubah Server Nickname sesuai IGN.',
              inline: false,
            },
            {
              name: '✏️ 3. EDIT ID GAME & JABATAN (EDIT)',
              value:
                '`/transfer edit [user] (new_id_dl) (position)`\n• **Ganti ID Game:** Isi opsi `new_id_dl` untuk memperbarui ID Duel Links *(Memakan 1x Kuota Transfer)*.\n• **Ganti Jabatan:** Isi opsi `position` untuk memindahkan jabatan Ketua/Wakil.',
              inline: false,
            },
            {
              name: '🛡️ Hak Akses Fitur',
              value:
                'Hanya **Ketua**, **Wakil Ketua**, dan **Admin** yang memiliki wewenang untuk mengeksekusi command ini.',
              inline: false,
            },
          ],
          footer: {
            text: 'Team Wars Indonesia System • Gunakan fitur ini dengan bijak.',
          },
        },
      ],
    };

    // 1. Cek apakah Message ID sudah pernah tersimpan di Upstash KV
    const existingMsgId = await kv.get<string>(KV_GUIDE_MSG_KEY);

    let response: any;
    let actionType = '';

    if (existingMsgId) {
      try {
        // 🟢 2. KONDISI PATCH: Jika Message ID ada, lakukan update ke pesan lama
        response = await discordAPI(
          `/channels/${TARGET_CHANNEL_ID}/messages/${existingMsgId}`,
          'PATCH',
          payload
        );
        actionType = 'UPDATED (PATCH)';
      } catch (patchErr) {
        // Fallback: Jika pesan lama di Discord terhapus manual / beda channel, kirim pesan baru (POST)
        response = await discordAPI(`/channels/${TARGET_CHANNEL_ID}/messages`, 'POST', payload);
        actionType = 'RE-CREATED (POST)';
      }
    } else {
      // 🔴 3. KONDISI POST: Jika belum ada di KV, kirim pesan baru
      response = await discordAPI(`/channels/${TARGET_CHANNEL_ID}/messages`, 'POST', payload);
      actionType = 'CREATED (POST)';
    }

    // 4. Simpan / Perbarui Message ID di Upstash KV
    if (response?.id) {
      await kv.set(KV_GUIDE_MSG_KEY, response.id);
    }

    return NextResponse.json({
      success: true,
      action: actionType,
      message: `🚀 Embed panduan transfer berhasil di-${actionType.toLowerCase()} ke channel ${TARGET_CHANNEL_ID}!`,
      messageId: response.id,
      channelId: TARGET_CHANNEL_ID,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengunggah/memperbarui embed panduan transfer.',
      },
      { status: 500 }
    );
  }
          }
