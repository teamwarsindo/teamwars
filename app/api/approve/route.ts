import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';
import { getApprovalTemplate } from '@/lib/email-templates'; // 👈 Import Template Baru

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // 1. Tangkap nama tim (slug) dari URL
    const searchParams = request.nextUrl.searchParams;
    const teamSlug = searchParams.get('team');

    if (!teamSlug) {
      return new NextResponse('Parameter tim tidak ditemukan.', { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const teamData: any = await kv.hgetall(kvKey);

    // 2. Validasi apakah tim ada di database
    if (!teamData) {
      return new NextResponse('Tim tidak ditemukan di database.', { status: 404 });
    }

    // ==========================================
    // HELPER: Rangka HTML Standar untuk Layar Admin Browser
    // ==========================================
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
    if (teamData.statusVerifikasi === 'Approved') {
      return new NextResponse(renderHTML(`
        <div style="font-family: sans-serif; text-align: center; background-color: #0f172a; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #1e293b; color: #f8fafc; width: 100%;">
          <h2 style="color: #eab308; margin-top: 0;">⚠️ Tim ${teamData.namaTim.toUpperCase()} Sudah Dikonfirmasi!</h2>
          <p style="color: #94a3b8; line-height: 1.6;">Email konfirmasi resmi sudah terkirim ke peserta sebelumnya. Aksi ini tidak perlu diulang.</p>
          <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini.</p>
        </div>
      `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // 4. Update status di Redis jadi Approved
    await kv.hset(kvKey, { statusVerifikasi: 'Approved' });

    const TeamName = teamData.namaTim;

    // ==========================================
    // 5. UPDATE WEBHOOK DISCORD (PATCH MESSAGE)
    // ==========================================
    if (teamData.financeMsgId && process.env.DISCORD_WEBHOOK_FINANCE) {
      const webhookEditUrl = `${process.env.DISCORD_WEBHOOK_FINANCE}/messages/${teamData.financeMsgId}`;
      
      await fetch(webhookEditUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `Detail Registrasi: ${TeamName}`,
            color: 3066993, // Warna Hijau (Success)
            description: `**✅ PEMBAYARAN TELAH DIKONFIRMASI!**\nTim verifikator telah menyetujui setoran ini dan email konfirmasi otomatis telah meluncur ke peserta.`,
            image: { url: teamData.buktiTransfer },
            fields: [
              { 
                name: "Waktu Konfirmasi", 
                value: `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
                inline: true
              },
              { name: "Status", value: "✅ Terkonfirmasi", inline: true }
            ],
          }]
        })
      }).catch(err => console.error("Gagal edit webhook Discord:", err));
    }

    // ==========================================
    // 6. KIRIM EMAIL KONFIRMASI (MENGGUNAKAN TEMPLATE)
    // ==========================================
    if (teamData.email) {
      const waktuKonfirmasi = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "long",
        timeStyle: "medium"
      }) + " WIB";

      let parsedPlayers = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      const ketuaTim = parsedPlayers.find((p: any) => p.role === 'Ketua') || teamData.ketua || { namaLengkap: 'Kapten' };
      const warnaTim = teamData.warna || '#4CAF50';
      const editToken = teamData.editToken || ''; // 👈 Mengambil token dari database

      // Eksekusi fungsi template
      const emailHtml = getApprovalTemplate({
        namaTim: TeamName,
        warna: warnaTim,
        namaKetua: ketuaTim.namaLengkap,
        waktuKonfirmasi,
        editToken
      });

      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: teamData.email,
        subject: `✅ Pendaftaran Berhasil: Tim ${TeamName} [Teamwars S7]`,
        html: emailHtml // 👈 Menggunakan hasil template yang bersih
      });
    }

    // 7. Tampilkan Pesan Sukses ke Layar Admin Finance
    return new NextResponse(renderHTML(`
      <div style="font-family: sans-serif; text-align: center; background-color: #052e16; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #166534; color: #f0fdf4; width: 100%;">
        <h1 style="color: #4ade80; margin-top: 0;">✅ Berhasil Dikonfirmasi!</h1>
        <p style="color: #bbf7d0; font-size: 18px; margin-bottom: 5px;">Status tim <strong>${TeamName}</strong> telah diubah menjadi Approved.</p>
        <p style="color: #86efac; margin-top: 0;">Email konfirmasi resmi otomatis telah dikirim.</p>
        <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini dan kembali ke Discord.</p>
      </div>
    `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error("Error approve tim:", error);
    return new NextResponse('Terjadi kesalahan internal server.', { status: 500 });
  }
      }
        
