import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';
import { getApprovalTemplate } from '@/lib/email-templates'; 
import { discordAPI } from '@/lib/discord/utils'; 
import { DISCORD_CONFIG } from '@/lib/discord/config'; 

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

    const TeamName = teamData.namaTim;
    const isAlreadyApproved = teamData.statusVerifikasi === 'Approved';

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

    // 3. Update status di Redis jadi Approved (Jika belum)
    if (!isAlreadyApproved) {
      await kv.hset(kvKey, { statusVerifikasi: 'Approved' });
    }

    // ==========================================
    // 4. UPDATE PESAN DISCORD (SELALU DIJALANKAN)
    // ==========================================
    // Meskipun sudah di-approve sebelumnya, embed Discord TETAP diubah jadi Hijau
    if (teamData.financeMsgId) {
      // 1. Format tanggal agar rapi (Contoh: 20 Juli 2026 pukul 21.08)
      const d = new Date();
      const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      const waktu = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.');
      const waktuKonfirmasiDiscord = `${tgl} pukul ${waktu}`;

      try {
        await discordAPI(`/channels/${DISCORD_CONFIG.CH_BUKTI}/messages/${teamData.financeMsgId}`, 'PATCH', {
          embeds: [{
            title: `Detail Registrasi: ${TeamName}`,
            color: 3066993, // Warna Hijau (Success)
            description: `**✅ PEMBAYARAN TELAH DIKONFIRMASI!**\nTim verifikator telah menyetujui setoran ini dan email konfirmasi otomatis telah meluncur ke peserta.`,
            image: { url: teamData.buktiTransfer },
            fields: [
              { 
                name: "Waktu Konfirmasi", 
                value: `${waktuKonfirmasiDiscord} WIB`, // 👈 Menggunakan format yang sudah dirapikan
                inline: true
              },
              { name: "Status", value: "✅ Terkonfirmasi", inline: true }
            ],
          }]
        });
      } catch (err) {
        console.error("Gagal edit pesan Discord (Bot API):", err);
      }
    }
  
    // ==========================================
    // 5. PENCEGAH SPAM EMAIL (BERHENTI DI SINI JIKA SUDAH PERNAH APPROVED)
    // ==========================================
    if (isAlreadyApproved) {
      return new NextResponse(renderHTML(`
        <div style="font-family: sans-serif; text-align: center; background-color: #0f172a; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #1e293b; color: #f8fafc; width: 100%;">
          <h2 style="color: #eab308; margin-top: 0;">⚠️ Tim ${TeamName.toUpperCase()} Sudah Pernah Dikonfirmasi!</h2>
          <p style="color: #94a3b8; line-height: 1.6;">Status pesan di Discord <b>telah berhasil diperbarui</b> menjadi hijau, namun email konfirmasi resmi <b>tidak dikirim ulang</b> untuk mencegah spam ke peserta.</p>
          <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini.</p>
        </div>
      `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ==========================================
    // 6. KIRIM EMAIL KONFIRMASI (HANYA JIKA BARU PERTAMA KALI APPROVED)
    // ==========================================
    if (teamData.email) {
      const waktuKonfirmasi = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "long",
        timeStyle: "medium"
      }) + " WIB";

      let parsedPlayers = [];
      try {
        parsedPlayers = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : (teamData.players || []);
      } catch (e) {
        parsedPlayers = [];
      }
      
      const ketuaTim = parsedPlayers.find((p: any) => p.role === 'Ketua') || teamData.ketua || { namaLengkap: 'Kapten' };
      const warnaTim = teamData.warna || '#4CAF50';
      const editToken = teamData.editToken || '';

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
        html: emailHtml
      });
    }

    // 7. Tampilkan Pesan Sukses ke Layar Admin Finance (Untuk approve pertama kali)
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
