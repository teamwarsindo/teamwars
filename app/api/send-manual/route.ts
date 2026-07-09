import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';

const resend = new Resend(process.env.RESEND_API_KEY);

// 🎨 Helper untuk generate HTML (Sesuai gaya template TWI lu)
const getManualTokenTemplate = (namaTim: string, token: string, warna: string) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${warna};">
    
    <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${warna};">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
      <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 - AKSES MANAJEMEN TIM</p>
    </div>
    
    <div style="padding: 30px 20px;">
      <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo Kapten tim ${namaTim}! 🏆</h2>
      <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
        Untuk mempermudah persiapan pertempuran di Team Wars Indonesia Season 7, panitia sekarang menyediakan akses khusus agar kapten dapat mengelola dan mengedit susunan <em>roster</em> pemain secara mandiri.
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://teamwars.web.id/edit-team/${token}" style="background-color: ${warna}; color: #ffffff; padding: 14px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; letter-spacing: 1px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
          ⚙️ AKSES LINK RAHASIA TIM KAMU
        </a>
        <p style="margin: 15px 0 0 0; color: #888888; font-size: 12px;">Atau gunakan tautan manual berikut:<br><a href="https://teamwars.web.id/edit-team/${token}" style="color: #4facfe; line-height: 2;">https://teamwars.web.id/edit-team/${token}</a></p>
      </div>
      
      <div style="background-color: rgba(255, 107, 107, 0.1); border-left: 4px solid #ff6b6b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <p style="color: #ff6b6b; font-size: 13px; line-height: 1.6; margin: 0;">
          ⚠️ <strong>PENTING:</strong> Tolong simpan link ini baik-baik dan <strong>jangan disebarkan</strong> ke publik/tim lain. Setiap perubahan yang kamu lakukan di link tersebut akan langsung tersinkronisasi otomatis dengan <em>database</em> panitia.
        </p>
      </div>

      <p style="color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; margin-top: 30px; font-style: italic;">
        Good luck and duel standby! 🔥
      </p>
    </div>
    
    <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 2px solid ${warna};">
      <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.8;">
        Sistem Registrasi TWI Season 7<br>
        <strong style="color: #888888;">&copy; 2026 Team Wars Indonesia. All rights reserved.</strong>
      </p>
    </div>

  </div>
`;

// 🚀 Endpoint GET untuk eksekusi via Browser
export async function GET() {
  try {
    // Data Tim 1
    const emailAsashin = resend.emails.send({
      from: EMAIL_CONFIG.sender, // Pastikan ini ngambil dari config lu
      to: "syaiful.nuruddin@gmail.com", // 👈 ISI DENGAN EMAIL ASLI
      subject: "Akses Edit Roster: Tim Asashin OG [Team Wars S7]",
      html: getManualTokenTemplate(
        "Asashin OG", 
        "dc3a39a4-fd7c-4a83-8e04-726d5f367aa1", 
        "#E63946" // Warna aksen Asashin (bisa lu sesuaikan)
      )
    });

    // Data Tim 2
    const emailDino = resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: "achmad.nuruddin.id@gmail.com", // 👈 ISI DENGAN EMAIL ASLI
      subject: "Akses Edit Roster: Tim UX DINO RAMPAGE [Team Wars S7]",
      html: getManualTokenTemplate(
        "UX DINO RAMPAGE", 
        "69272935-084e-4348-95b8-daacd906a345", 
        "#2A9D8F" // Warna aksen UX Dino (bisa lu sesuaikan)
      )
    });

    // Eksekusi pengiriman berbarengan
    await Promise.all([emailAsashin, emailDino]);

    return NextResponse.json({ 
      success: true, 
      message: "Email rahasia sukses diluncurkan ke Asashin OG & UX Dino Rampage!" 
    });

  } catch (error: any) {
    console.error("Gagal kirim email manual:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
