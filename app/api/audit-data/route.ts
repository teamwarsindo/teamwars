import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';

// ==========================================
// 1. INISIALISASI RESEND
// ==========================================
const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// 2. FUNGSI VALIDASI & HELPER
// ==========================================
function toProperCase(str: string) {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

function trimSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function validateTeamName(value: string): string | undefined {
  const v = value ? value.trim() : "";
  if (!v) return "Nama Tim wajib diisi.";
  if (v.length < 3) return "Nama Tim minimal 3 karakter.";
  if (v.startsWith(".") || v.endsWith(".")) return "Nama Tim tidak boleh diawali/diakhiri titik.";
  if (/[^a-zA-Z0-9 .'-]/.test(v)) return "Nama Tim hanya boleh huruf, angka, spasi, titik, tanda kutip, dan strip.";
  return undefined;
}

function validateDuelId(value: string): string | undefined {
  const v = value || "";
  const digits = v.replace(/\D/g, "");
  if (!digits) return "ID Duel Links wajib diisi.";
  if (digits.length < 9) return "ID kurang dari 9 angka.";
  if (digits.length > 9) return "ID maksimal 9 angka.";
  return undefined;
}

function validateIGN(value: string): string | undefined {
  const v = value ? value.trim() : "";
  if (!v) return "IGN wajib diisi.";
  if (v.length < 3) return "IGN minimal 3 karakter.";
  if (v.length > 12) return "IGN maksimal 12 karakter.";
  if (/[^\x20-\x7E]/.test(v)) return "IGN tidak boleh mengandung emoji atau huruf asing.";
  return undefined;
}

function validateDiscord(value: string): string | undefined {
  const v = value ? value.trim() : "";
  if (!v) return "Discord wajib diisi.";
  if (v.length < 2) return "Discord minimal 2 karakter.";
  if (v.length > 32) return "Discord maksimal 32 karakter.";
  if (v.includes("..")) return "Discord tidak boleh ada titik berurutan (..).";
  if (v.startsWith(".") || v.endsWith(".")) return "Discord tidak boleh diawali/diakhiri titik.";
  if (!/^[a-zA-Z0-9_.]+$/.test(v)) return "Discord hanya boleh huruf, angka, _, dan .";
  return undefined;
}

function validateRealName(value: string): string | undefined {
  const v = value ? trimSpaces(value) : "";
  if (!v) return "Nama Lengkap wajib diisi.";
  if (v.length < 3) return "Nama Lengkap minimal 3 karakter.";
  if (v.length > 60) return "Nama Lengkap maksimal 60 karakter.";
  if (/[^a-zA-Z\s'-]/.test(v)) return "Nama Lengkap hanya boleh menggunakan abjad, spasi, tanda kutip, dan strip.";
  return undefined;
}

// ==========================================
// 3. TEMPLATE EMAIL PERBAIKAN DATA
// ==========================================
function getCorrectionTemplate(data: {
  namaTim: string;
  warna: string;
  namaKetua: string;
  editToken: string;
  teamErrors: string[];
  playerErrors: { ign: string; role: string; errors: string[] }[];
}) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${data.warna || '#ff3333'};">
      
      <!-- HEADER -->
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${data.warna || '#ff3333'};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SISTEM AUDIT DATA SEASON 7</p>
      </div>
      
      <div style="padding: 30px 20px;">
        
        <!-- BANNER STATUS PERINGATAN -->
        <div style="background-color: rgba(244, 67, 54, 0.1); border: 1px solid #F44336; color: #F44336; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 25px; font-weight: bold; letter-spacing: 1px; font-size: 14px;">
          ⚠️ PERHATIAN: DITEMUKAN FORMAT DATA TIDAK VALID
        </div>

        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo, ${toProperCase(data.namaKetua)}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Kami dari tim panitia Team Wars Indonesia baru saja memperbarui standar validasi keamanan data untuk turnamen Season 7. Berdasarkan pengecekan otomatis, sistem kami mendeteksi adanya data pada tim <strong>${data.namaTim}</strong> yang <strong>tidak sesuai dengan format aturan terbaru kami</strong>.
        </p>

        <!-- DAFTAR KESALAHAN -->
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333; border-left: 4px solid #F44336;">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Rincian Data yang Harus Diperbaiki:</h3>
          
          ${data.teamErrors.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #ff9999; font-size: 15px;">Data Identitas Tim:</strong>
              <ul style="color: #cccccc; font-size: 14px; margin-top: 5px; padding-left: 20px;">
                ${data.teamErrors.map(err => `<li>${err}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${data.playerErrors.length > 0 ? `
            <div style="margin-bottom: 10px;">
              <strong style="color: #ff9999; font-size: 15px;">Data Roster Pemain:</strong>
              ${data.playerErrors.map(p => `
                <div style="background-color: #292929; border-radius: 6px; padding: 12px; margin-top: 10px; border-left: 3px solid #ff6b6b;">
                  <span style="font-weight: bold; color: #ffffff;">${p.ign}</span> <span style="font-size: 12px; color: #888;">(${p.role})</span>
                  <ul style="color: #cccccc; font-size: 14px; margin: 5px 0 0 0; padding-left: 20px;">
                    ${p.errors.map(err => `<li>${err}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Mohon kerjasamanya untuk <strong>segera memperbaiki data tersebut</strong> agar tim Anda dapat lolos tahap verifikasi administrasi dan bermain di Season 7.
        </p>

        <!-- LINK EDIT TOKEN -->
        <div style="background-color: #1e1e1e; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px solid #333; border-left: 4px solid ${data.warna || '#5865F2'};">
          <p style="color: #ffffff; font-size: 14px; margin-bottom: 15px; font-weight: bold;">Gunakan link akses rahasia Anda di bawah ini untuk mengedit data:</p>
          <a href="https://teamwars.web.id/edit-team/${data.editToken}" style="background-color: #AA1348; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; letter-spacing: 1px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            ⚙️ PERBAIKI DATA TIM SEKARANG
          </a>
          <p style="margin: 12px 0 0 0; color: #888888; font-size: 11px;">(Sistem akan otomatis mendeteksi baris berwarna merah pada kolom yang salah saat Anda membuka tautan di atas).</p>
        </div>

      </div>
      
      <!-- FOOTER -->
      <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 2px solid ${data.warna || '#ff3333'};">
        <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.8;">
          Admin TWI Season 7<br>
          <strong style="color: #888888;">&copy; 2026 Team Wars Indonesia. All rights reserved.</strong>
        </p>
      </div>

    </div>
  `;
}

// ==========================================
// 4. API ROUTE: EKSEKUTOR AUDIT
// ==========================================
export async function GET() {
  try {
    const teams = await kv.smembers("global:teams");
    const auditResults: any[] = [];
    let emailsSent = 0;

    for (const slug of teams) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData) continue;

      const teamErrors: string[] = [];
      const playerErrors: { ign: string; role: string; errors: string[] }[] = [];

      // Validasi Nama Tim
      const teamNameErr = validateTeamName(teamData.namaTim);
      if (teamNameErr) teamErrors.push(teamNameErr);

      // Validasi Pemain
      if (teamData.players) {
        const parsedPlayers = typeof teamData.players === "string" ? JSON.parse(teamData.players) : teamData.players;
        let ketuaName = "Kapten";

        for (const p of parsedPlayers) {
          if (p.role === "Ketua") ketuaName = p.namaLengkap || p.ign;

          const pErrors: string[] = [];
          
          const realNameErr = validateRealName(p.namaLengkap);
          if (realNameErr) pErrors.push(`Nama Lengkap: ${realNameErr}`);
          
          const ignErr = validateIGN(p.ign);
          if (ignErr) pErrors.push(`IGN: ${ignErr}`);
          
          const duelIdErr = validateDuelId(p.idDuelLinks || p.duelId);
          if (duelIdErr) pErrors.push(`Duel ID: ${duelIdErr}`);
          
          const discordErr = validateDiscord(p.discord);
          if (discordErr) pErrors.push(`Discord: ${discordErr}`);

          if (pErrors.length > 0) {
            playerErrors.push({ ign: p.ign || "Unknown", role: p.role, errors: pErrors });
          }
        }
        teamData._ketuaName = ketuaName; // Simpan sementara untuk keperluan email
      }

      // Jika ada kesalahan, masukkan ke hasil audit dan KIRIM EMAIL
      if (teamErrors.length > 0 || playerErrors.length > 0) {
        auditResults.push({
          namaTim: teamData.namaTim,
          teamErrors,
          playerErrors
        });

        // Pastikan tim memiliki token dan email yang valid
        if (teamData.editToken && teamData.email) {
          try {
            await resend.emails.send({
              from: 'Admin TWI <admin@teamwars.web.id>', // Ganti sender dengan yang lu pakai (EMAIL_CONFIG.sender)
       //       to: teamData.email,
              to: 'teamwars.indo@gmail.com',
              subject: `[ACTION REQUIRED] Perbaikan Data Pendaftaran Tim ${teamData.namaTim} - TWI S7`,
              html: getCorrectionTemplate({
                namaTim: teamData.namaTim,
                warna: teamData.warna,
                namaKetua: teamData._ketuaName,
                editToken: teamData.editToken,
                teamErrors: teamErrors,
                playerErrors: playerErrors
              })
            });
            emailsSent++;
          } catch (emailErr) {
            console.error(`Gagal mengirim email audit ke ${teamData.email}:`, emailErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Proses Audit dan Broadcast Email Selesai!",
      totalTimDitemukanSalah: auditResults.length,
      emailBerhasilTerkirim: emailsSent,
      detailPelanggaran: auditResults
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
                                                                                                                                                                       }
