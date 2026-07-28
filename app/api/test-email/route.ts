import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';

// Pastikan API Key terbaca
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email } = data; // Email tujuan test

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email tujuan wajib diisi!" }, 
        { status: 400 }
      );
    }

    console.log("=== MEMULAI TEST KIRIM EMAIL ===");
    console.log(`Target Email: ${email}`);
    console.log(`Status API KEY: ${process.env.RESEND_API_KEY ? "Terdeteksi (OK)" : "TIDAK TERDETEKSI (KOSONG!)"}`);

    // Proses pengiriman melalui Resend
    const { data: resendData, error: resendError } = await resend.emails.send({
      // PENTING: Jika domain belum diverifikasi di Resend, kamu WAJIB pakai onboarding@resend.dev
      // Jika sudah diverifikasi, ganti dengan email domainmu (misal: no-reply@domainkamu.com)
      from: 'onboarding@resend.dev', 
      to: email,
      subject: `Test Debugging Email [${new Date().toISOString()}]`,
      html: `<p>Ini adalah email test untuk mengecek log error.</p>`,
    });

    // Jika dari sisi Resend mengembalikan error (misal: domain belum verifikasi, bounce, dll)
    if (resendError) {
      console.error("❌ ERROR DARI RESEND:", resendError);
      return NextResponse.json({ 
        success: false, 
        message: "Resend menolak pengiriman email", 
        error_detail: resendError 
      }, { status: 400 });
    }

    // Jika berhasil
    console.log("✅ EMAIL BERHASIL TERKIRIM:", resendData);
    return NextResponse.json({ 
      success: true, 
      message: "Email berhasil masuk antrean Resend!", 
      data: resendData 
    });

  } catch (error: any) {
    // Menangkap error dari sisi server (misal: format JSON salah, API Resend down)
    console.error("💥 INTERNAL SERVER ERROR:", error.message || error);
    return NextResponse.json({ 
      success: false, 
      message: "Terjadi kesalahan di server", 
      error_detail: error.message || String(error)
    }, { status: 500 });
  }
}
