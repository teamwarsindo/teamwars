import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } 
) {
  try {
    // 1. TANGKAP ID DARI URL 
    const { id } = await context.params;
    const messageId = id;

    if (!messageId) {
      return new NextResponse('ID Pesan tidak boleh kosong.', { status: 400 });
    }

    // 2. CEK DATABASE: Biar nggak ke-eksekusi 2x kalau ke-refresh
    const isUpdated = await kv.get(`patched_discord_msg:${messageId}`);
    if (isUpdated) {
      return new NextResponse(`⚠️ Pesan dengan ID ${messageId} sudah pernah di-update. Eksekusi dibatalkan untuk mencegah spam.`, { status: 200 });
    }

    // ==========================================
    // 3. ISI PESAN (GANTI MANUAL DI SINI KALAU MAU UPDATE TIM LAIN)
    // ==========================================
    const teamName = "Asashin Og";
    const colorHex = "7300FF";
    const logoFile = "asashin_og_logo.png"; // Nama file yang ada di folder upload/logo/

    // ==========================================
    // 4. EKSEKUSI UPDATE KE DISCORD
    // ==========================================
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_CREATIVE;
    if (!WEBHOOK_URL) {
      return new NextResponse('Webhook URL tidak ditemukan di environment.', { status: 500 });
    }

    const webhookEditUrl = `${WEBHOOK_URL}/messages/${messageId}`;
    const parsedColor = parseInt(colorHex, 16);

    const response = await fetch(webhookEditUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `<@&1171096454685794324> 🎨 Aset Tim Baru: **${teamName}**!`, 
        embeds: [{
          title: `Aset Visual: ${teamName}`,
          color: isNaN(parsedColor) ? 3447003 : parsedColor,
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](https://teamwars.web.id/logo/${logoFile}/download)**`,
          image: { 
            // Tetap panggil dari Cloudinary untuk render gambar di Discord
            url: `https://res.cloudinary.com/dhplw8rsd/image/upload/v1783422734/logo/${logoFile}`
          },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`#${colorHex}\``, inline: true }
          ]
        }]
      })
    });

    if (response.ok) {
      // Kunci ID pesannya di database biar nggak spam
      await kv.set(`patched_discord_msg:${messageId}`, true);
      return new NextResponse(`✅ SUKSES! Pesan ID ${messageId} untuk tim ${teamName} berhasil diperbarui.`, { status: 200 });
    } else {
      const err = await response.json();
      return new NextResponse(`❌ GAGAL update Discord: ${JSON.stringify(err)}`, { status: 400 });
    }

  } catch (error) {
    console.error("Error patching message:", error);
    return new NextResponse('Terjadi kesalahan internal server.', { status: 500 });
  }
          }
