import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';

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
    // HELPER: Rangka HTML Standar (Fix Bug Teks Aneh & Emoji)
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

    const properTeamName = teamData.namaTim.toUpperCase();

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
            title: `Detail Registrasi: ${properTeamName}`,
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
    // 6. KIRIM EMAIL KONFIRMASI (Template Email 2 Terbaru)
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

      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: teamData.email,
        subject: `✅ Pendaftaran Berhasil: Tim ${properTeamName} [Teamwars S7]`,
        html: `
          <!-- BORDER UTAMA MENGGUNAKAN WARNA HEX TIM -->
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${warnaTim};">
            
            <!-- HEADER -->
            <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${warnaTim};">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
              <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 REGISTRATION</p>
            </div>
            
            <div style="padding: 30px 20px;">
              
              <!-- BANNER STATUS VALID -->
              <div style="background-color: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; color: #4CAF50; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 25px; font-weight: bold; letter-spacing: 1px; font-size: 14px;">
                ✅ STATUS: APPROVED (Pendaftaran Sah & Valid)
              </div>

              <!-- GREETING & BODY PESAN -->
              <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo, ${ketuaTim.namaLengkap}!</h2>
              <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
                Pembayaran atas pendaftaran tim <strong>${properTeamName}</strong> telah berhasil kami verifikasi pada <strong>${waktuKonfirmasi}</strong>.
              </p>

              <!-- INSTRUKSI WAJIB DISCORD -->
              <div style="background-color: #1e1e1e; padding: 20px; border-left: 4px solid ${warnaTim}; margin: 25px 0; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; margin-bottom: 10px;">Langkah Selanjutnya: Wajib Join Discord!</h3>
                <p style="margin: 0 0 15px 0; color: #cccccc; line-height: 1.6; font-size: 14px;">
                  Harap segera bergabung ke server Discord Team Wars Indonesia untuk mendapatkan <strong>Role Tim</strong> dan akses penuh ke <em>channel</em> khusus tim Anda.
                </p>
                
                <div style="margin-bottom: 15px; text-align: center; background-color: #000; padding: 15px; border-radius: 6px; border: 1px solid #333;">
                  <a href="https://teamwars.web.id/invite" style="background-color: #5865F2; color: #ffffff; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 14px; letter-spacing: 1px;">JOIN DISCORD TWI SEKARANG</a>
                  <p style="margin: 10px 0 0 0; color: #888888; font-size: 12px;">Atau gunakan link: <a href="https://teamwars.web.id/invite" style="color: #4facfe;">https://teamwars.web.id/invite</a></p>
                </div>
                
                <p style="margin: 0; color: #cccccc; line-height: 1.6; font-size: 13px;">
                  Setelah berhasil bergabung, silakan <em>tag</em> <strong>@Admin Discord</strong> atau hubungi Admin kami via Direct Message (<a href="https://discordapp.com/users/tsaqif.mtz" style="color: #4facfe; text-decoration: none; font-weight: bold;">@tsaqif.mtz</a>) untuk melakukan klaim <em>role</em>.
                </p>
              </div>

              <!-- INSTRUKSI UPDATE DATA -->
              <div style="background-color: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #ffffff; font-size: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">⚙️ Prosedur Perubahan Data Roster</h3>
                <p style="color: #cccccc; font-size: 13px; line-height: 1.6;">
                  Sebagai pengingat, kuota maksimal untuk satu tim adalah <strong>10 pemain</strong> (termasuk Ketua dan Wakil). Anda masih diperbolehkan untuk melakukan penyesuaian susunan roster selama pendaftaran belum ditutup.
                </p>
                <p style="color: #cccccc; font-size: 13px; line-height: 1.6;">
                  Jika Anda perlu menambah, menghapus, mengganti, atau memperbaiki data pemain (misal: <em>typo</em>), silakan <strong>balas (reply) email ini</strong> dengan menyalin dan mengisi formulir di bawah ini:
                </p>
                
                <pre style="background-color: #000000; color: #4facfe; padding: 15px; border-radius: 6px; font-size: 12px; overflow-x: auto; border: 1px solid #333;">FORMAT PERUBAHAN DATA ROSTER
-----------------------------------
Jenis Perubahan : [Tambah / Hapus / Edit / Ganti Pemain]
Nama Tim        : [Nama Tim Anda]
Target Pemain   : [Sebutkan urutan pemain / Nama IGN lama. Kosongkan jika Tambah Pemain]

DATA BARU (Isi pada bagian yang berubah saja):
- Nama Asli     : 
- Discord       : 
- IGN           : 
- ID Duel Links : </pre>
                
                <p style="color: #ff6b6b; font-size: 13px; line-height: 1.6; margin-bottom: 0;">
                  ⚠️ <strong>PERINGATAN KERAS:</strong> Begitu turnamen resmi dilaksanakan (Kick-Off), seluruh akses perubahan data mandiri akan ditutup total.
                </p>
              </div>

            </div>
            
            <!-- FOOTER BARU -->
            <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 2px solid ${warnaTim};">
              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.8;">
                Sistem Registrasi TWI Season 7<br>
                <strong style="color: #888888;">&copy; 2026 Team Wars Indonesia. All rights reserved.</strong>
              </p>
            </div>

          </div>
        `
      });
    }

    // 7. Tampilkan Pesan Sukses ke Layar Admin Finance
    return new NextResponse(renderHTML(`
      <div style="font-family: sans-serif; text-align: center; background-color: #052e16; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #166534; color: #f0fdf4; width: 100%;">
        <h1 style="color: #4ade80; margin-top: 0;">✅ Berhasil Dikonfirmasi!</h1>
        <p style="color: #bbf7d0; font-size: 18px; margin-bottom: 5px;">Status tim <strong>${properTeamName}</strong> telah diubah menjadi Approved.</p>
        <p style="color: #86efac; margin-top: 0;">Email konfirmasi resmi otomatis telah dikirim.</p>
        <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini dan kembali ke Discord.</p>
      </div>
    `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error("Error approve tim:", error);
    return new NextResponse('Terjadi kesalahan internal server.', { status: 500 });
  }
}
