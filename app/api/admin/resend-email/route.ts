import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper & Template
function toProperCase(str: string) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

function getApprovalTemplate(data: any) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${data.warna};">
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${data.warna};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 REGISTRATION</p>
      </div>
      <div style="padding: 30px 20px;">
        <div style="background-color: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; color: #4CAF50; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 25px; font-weight: bold; letter-spacing: 1px; font-size: 14px;">
          ✅ STATUS: APPROVED (Pendaftaran Sah & Valid)
        </div>
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo, ${toProperCase(data.namaKetua)}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Berikut adalah tautan manajemen untuk tim <strong>${data.namaTim}</strong> yang telah dikonfirmasi pada <strong>${data.waktuKonfirmasi}</strong>.
        </p>
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333; border-left: 4px solid ${data.warna};">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">⚙️ Manajemen Roster Tim</h3>
          <p style="color: #cccccc; font-size: 13px; line-height: 1.6;">
            Anda diberikan akses khusus untuk mengubah data pemain, menambah roster, atau memperbaiki kesalahan penulisan (<em>typo</em>) secara mandiri.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://teamwars.web.id/edit-team/${data.editToken}" style="background-color: #5865F2; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; letter-spacing: 1px; border: 1px solid #4752C4;">
              ✏️ KLIK DISINI UNTUK MENGEDIT ROSTER TIM
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// GET: Mengambil daftar tim untuk Dropdown di UI
export async function GET() {
  try {
    const allKeys = await kv.keys('teams:*');
    const teams = [];

    for (const key of allKeys) {
      const data: any = await kv.hgetall(key);
      if (data && data.namaTim) {
        teams.push({ key: key, namaTim: data.namaTim });
      }
    }

    // Urutkan berdasarkan nama tim A-Z
    teams.sort((a, b) => a.namaTim.localeCompare(b.namaTim));

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Gagal mengambil data tim" }, { status: 500 });
  }
}

// POST: Menerima request dari UI dan mengirim email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamKey, targetEmail } = body;

    if (!teamKey || !targetEmail) {
      return NextResponse.json({ success: false, message: "Pilih tim dan masukkan email!" }, { status: 400 });
    }

    const teamData: any = await kv.hgetall(teamKey);
    if (!teamData) {
      return NextResponse.json({ success: false, message: "Tim tidak ditemukan." }, { status: 404 });
    }

    const TeamName = teamData.namaTim;
    const warnaTim = teamData.warna || '#4CAF50';
    const editToken = teamData.editToken || '';
    const waktuKonfirmasi = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

    let parsedPlayers = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    const ketuaTim = parsedPlayers?.find((p: any) => p.role === 'Ketua') || teamData.ketua || { namaLengkap: 'Kapten' };

    const emailHtml = getApprovalTemplate({
      namaTim: TeamName,
      warna: warnaTim,
      namaKetua: ketuaTim.namaLengkap,
      waktuKonfirmasi,
      editToken
    });

    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: targetEmail,
      subject: `[Kirim Ulang] Tautan Edit Tim ${TeamName} - Teamwars S7`,
      html: emailHtml
    });

    return NextResponse.json({ success: true, message: `Email berhasil dikirim ke ${targetEmail}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
