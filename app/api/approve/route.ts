import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // 1. Tangkap nama tim (slug) dari URL (contoh: ?team=nama-tim)
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

    // 3. Cek apakah sudah pernah di-approve sebelumnya
    if (teamData.statusVerifikasi === 'Approved') {
      return new NextResponse(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>⚠️ Tim ${teamData.namaTim} Sudah Dikonfirmasi Sebelumnya!</h2>
          <p>Email sukses sudah terkirim ke peserta. Anda boleh menutup halaman ini.</p>
        </div>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // 4. Update status di Redis jadi Approved
    await kv.hset(kvKey, { statusVerifikasi: 'Approved' });

    // 5. Kirim Email Tanda Lulus ke Peserta
    if (teamData.email) {
      const properTeamName = teamData.namaTim.toUpperCase();
      
      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: teamData.email,
        subject: `✅ Pendaftaran Berhasil: Tim ${properTeamName} [Teamwars S7]`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #fff; padding: 30px; border-radius: 10px; border: 1px solid #333;">
            <h2 style="color: #4CAF50;">SELAMAT! PEMBAYARAN TERKONFIRMASI ✅</h2>
            <p style="color: #ccc;">Halo kapten tim <strong>${properTeamName}</strong>,</p>
            <p style="color: #ccc;">Tim Finance kami telah memverifikasi pembayaran Anda. Pendaftaran tim Anda sekarang berstatus <strong>VALID</strong>.</p>
            <div style="background-color: #1e1e1e; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
              <p style="margin: 0; color: #fff;">Private Channel Discord tim kalian telah/akan segera diaktifkan oleh panitia. Silakan cek server TWI dan bersiap untuk bertanding!</p>
            </div>
            <p style="color: #777; font-size: 12px; text-align: center; margin-top: 30px;">Sistem Registrasi TWI Season 7</p>
          </div>
        `
      });
    }

    // 6. Tampilkan Pesan Sukses ke Layar Admin Finance
    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f0fdf4; padding: 40px; border-radius: 10px; max-width: 500px; margin-left: auto; margin-right: auto; border: 1px solid #bbf7d0;">
        <h1 style="color: #166534;">✅ Berhasil Dikonfirmasi!</h1>
        <p style="color: #15803d; font-size: 18px;">Status tim <strong>${teamData.namaTim}</strong> telah diubah menjadi Approved.</p>
        <p style="color: #166534;">Email kelulusan otomatis telah dikirim ke: <strong>${teamData.email}</strong></p>
        <p style="color: #666; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini dan kembali ke Discord.</p>
      </div>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error("Error approve tim:", error);
    return new NextResponse('Terjadi kesalahan internal server.', { status: 500 });
  }
}
