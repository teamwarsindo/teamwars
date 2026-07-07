import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';
import { getApprovedTemplate } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamSlug = searchParams.get('team');

    if (!teamSlug) {
      return new NextResponse('Parameter tim tidak ditemukan.', { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const teamData: any = await kv.hgetall(kvKey);

    if (!teamData) {
      return new NextResponse('Tim tidak ditemukan di database.', { status: 404 });
    }

    const renderHTML = (content: string) => `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Konfirmasi Pembayaran TWI</title>
      </head>
      <body style="background-color: #020817; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
        ${content}
      </body>
      </html>
    `;

    // 3. Cek apakah sudah pernah di-approve sebelumnya
    if (teamData.statusVerifikasi === 'Conformity') {
      return new NextResponse(renderHTML(`
        <div style="font-family: sans-serif; text-align: center; background-color: #0f172a; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #1e293b; color: #f8fafc; width: 100%;">
          <h2 style="color: #eab308; margin-top: 0;">⚠️ Tim ${teamData.namaTim.toUpperCase()} Sudah Dikonfirmasi!</h2>
          <p style="color: #94a3b8; line-height: 1.6;">Email konfirmasi resmi sudah terkirim ke peserta sebelumnya. Aksi ini tidak perlu diulang.</p>
          <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini.</p>
        </div>
      `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // 4. Update status di Redis 
    await kv.hset(kvKey, { statusVerifikasi: 'Conformity' });

    const properTeamName = teamData.namaTim.toUpperCase();

    // 5. UPDATE DISCORD -> MENGGUNAKAN "KTP BOT" (REST API)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const financeChannelId = process.env.DISCORD_FINANCE_CHANNEL_ID; 

    if (botToken && financeChannelId) {
      await fetch(`https://discord.com/api/v10/channels/${financeChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: `✅ <@&1144271761488216134> **UPDATE: PEMBAYARAN DIKONFIRMASI!**`,
          // Fitur canggih: Bot akan me-reply pesan webhook pending yang lama (jika message ID-nya tersimpan)
          message_reference: teamData.financeMsgId ? { message_id: teamData.financeMsgId } : undefined,
          embeds: [{
            title: `Detail Registrasi: ${properTeamName}`,
            color: 3066993, // Warna Hijau (Success)
            description: `**✅ PEMBAYARAN TELAH DIKONFIRMASI!**\nTim verifikator telah menyetujui setoran ini dan email konfirmasi otomatis telah meluncur ke peserta.`,
            fields: [
              { name: "Status Pembayaran", value: "✅ LUNAS & VALID", inline: true }
            ],
            footer: { text: `Dikonfirmasi pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` }
          }]
        })
      }).catch(err => console.error("Gagal kirim notif KTP Bot Discord:", err));
    }

    // 6. Kirim Email Konfirmasi Resmi ke Peserta (Pakai Template Baru)
    if (teamData.email) {
      // Pastikan data yang dilempar sesuai, kalau players belum di-parse, kita parse dulu
      let parsedPlayers = teamData.players;
      if (typeof parsedPlayers === 'string') {
        parsedPlayers = JSON.parse(parsedPlayers);
      }

      const emailHtml = getApprovedTemplate({
        namaTim: teamData.namaTim,
        warna: teamData.warna || '#4CAF50',
        ketua: teamData.ketua || parsedPlayers.find((p: any) => p.role === 'Ketua'),
        totalRoster: teamData.totalRoster,
        players: parsedPlayers
      });
      
      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: teamData.email,
        subject: `✅ Pendaftaran Berhasil: Tim ${properTeamName} [Teamwars S7]`,
        html: emailHtml
      });
    }

    // 7. Tampilkan Pesan Sukses ke Layar Admin Finance
    return new NextResponse(renderHTML(`
      <div style="font-family: sans-serif; text-align: center; background-color: #052e16; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #166534; color: #f0fdf4; width: 100%;">
        <h1 style="color: #4ade80; margin-top: 0;">✅ Berhasil Dikonfirmasi!</h1>
        <p style="color: #bbf7d0; font-size: 18px; margin-bottom: 5px;">Status tim <strong>${properTeamName}</strong> telah diubah menjadi Conformity.</p>
        <p style="color: #86efac; margin-top: 0;">Email konfirmasi resmi otomatis telah dikirim.</p>
        <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini dan kembali ke Discord.</p>
      </div>
    `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error("Error approve tim:", error);
    return new NextResponse('Terjadi kesalahan internal server.', { status: 500 });
  }
}
