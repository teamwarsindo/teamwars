import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id;

    if (!messageId) {
      return new NextResponse('ID Pesan tidak boleh kosong.', { status: 400 });
    }

    // 1. CEK DATABASE: Apakah pesan ini sudah pernah di-update?
    const isUpdated = await kv.get(`patched_discord_msg:${messageId}`);
    if (isUpdated) {
      return new NextResponse(`⚠️ Pesan dengan ID ${messageId} sudah pernah di-update. Eksekusi dibatalkan untuk mencegah spam.`, { status: 200 });
    }

    // 2. TANGKAP PARAMETER DARI URL (Untuk kebutuhan Reusable)
    const searchParams = request.nextUrl.searchParams;
    const teamName = searchParams.get('team');
    const colorHex = searchParams.get('color');
    const logoFile = searchParams.get('logo');

    // Validasi parameter wajib
    if (!teamName || !colorHex || !logoFile) {
      return new NextResponse('❌ Parameter tidak lengkap! Pastikan URL mengandung ?team=...&color=...&logo=...', { status: 400 });
    }

    // 3. EKSEKUSI UPDATE KE DISCORD
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_CREATIVE;
    if (!WEBHOOK_URL) {
      return new NextResponse('Webhook URL tidak ditemukan di environment.', { status: 500 });
    }

    const webhookEditUrl = `${WEBHOOK_URL}/messages/${messageId}`;
    
    // Parsing warna HEX ke integer agar terbaca oleh Discord
    const parsedColor = parseInt(colorHex.replace('#', ''), 16);

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
            // Tetap panggil dari Cloudinary untuk render gambar
            url: `https://res.cloudinary.com/dhplw8rsd/image/upload/v1783422734/logo/${logoFile}`
          },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`#${colorHex}\``, inline: true }
          ]
        }]
      })
    });

    if (response.ok) {
      // 4. SIMPAN STATUS KE DATABASE (Biar ke-lock dan gak bisa di-update 2x)
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
