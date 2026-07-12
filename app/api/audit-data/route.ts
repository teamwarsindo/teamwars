import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
// 🎯 1. IMPORT DARI FILE VALIDASI LU (Sesuaikan path-nya)
import { 
  validateTeamName, 
  validateRealName, 
  validateIGN, 
  validateDuelId, 
  validateDiscord,
  toProperCase
} from '@/lib/validators'; 

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// 2. TEMPLATE EMAIL PERBAIKAN DATA (REVISI)
// ==========================================
function getCorrectionTemplate(data: {
  namaTim: string;
  warna: string;
  namaKetua: string;
  editToken: string;
  teamErrors: { value: string; error: string; rule: string }[];
  playerErrors: {
    role: string;
    namaLengkap: string;
    ign: string;
    duelId: string;
    discord: string;
    issues: { field: string; error: string; rule: string }[];
  }[];
}) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${data.warna || '#ff3333'};">
      
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${data.warna || '#ff3333'};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">VERIFIKASI DATA SEASON 7</p>
      </div>
      
      <div style="padding: 30px 20px;">
        
        <div style="background-color: rgba(244, 67, 54, 0.1); border: 1px solid #F44336; color: #F44336; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 25px; font-weight: bold; letter-spacing: 1px; font-size: 14px;">
          ⚠️ PERHATIAN: PENYESUAIAN DATA DIBUTUHKAN
        </div>

        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo, ${toProperCase(data.namaKetua)}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Dalam rangka menjaga integritas turnamen, sistem kami melakukan sinkronisasi format data pendaftaran. Berdasarkan pengecekan otomatis, ditemukan penulisan data pada tim <strong>${data.namaTim}</strong> yang <strong>perlu disesuaikan dengan standar regulasi resmi</strong> dari platform terkait.
        </p>

        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333; border-left: 4px solid #F44336;">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Rincian Data yang Harus Diperbaiki:</h3>
          
          ${data.teamErrors.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <strong style="color: #ff9999; font-size: 15px;">Data Identitas Tim:</strong>
              ${data.teamErrors.map(err => `
                <div style="background-color: #292929; padding: 10px; border-radius: 6px; margin-top: 8px; border-left: 3px solid #ff6b6b;">
                  <span style="color: #aaaaaa; font-size: 13px;">Nama Tim Saat Ini:</span> <strong style="color: #ff6b6b;">${err.value}</strong><br>
                  <span style="color: #cccccc; font-size: 13px;">❌ <strong>Koreksi:</strong> ${err.error}</span><br>
                  <span style="color: #888888; font-size: 11px; font-style: italic;">(Mengacu pada ${err.rule})</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.playerErrors.length > 0 ? `
            <div style="margin-bottom: 10px;">
              <strong style="color: #ff9999; font-size: 15px;">Data Roster Pemain:</strong>
              ${data.playerErrors.map(p => {
                const getFieldStyle = (fieldName: string) => {
                  const issue = p.issues.find(i => i.field === fieldName);
                  return issue 
                    ? `color: #ff6b6b; font-weight: bold; text-decoration: underline wavy #ff6b6b;` 
                    : `color: #ffffff;`;
                };

                const getErrorText = (fieldName: string) => {
                  const issue = p.issues.find(i => i.field === fieldName);
                  return issue 
                    ? `<div style="margin-top: 4px; padding: 6px; background: rgba(244,67,54,0.1); border-radius: 4px; font-size: 12px; color: #ff9999; border-left: 2px solid #ff4444;">
                        ❌ ${issue.error}<br>
                        <span style="color: #888; font-size: 10px; font-style: italic;">Referensi: ${issue.rule}</span>
                       </div>` 
                    : '';
                };

                return `
                <div style="background-color: #292929; border-radius: 6px; padding: 15px; margin-top: 12px; border: 1px solid #444;">
                  <span style="background-color: #444; color: #ccc; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${p.role}</span>
                  
                  <div style="margin-top: 10px; font-size: 14px; line-height: 1.6;">
                    <div style="margin-bottom: 8px;">
                      <span style="color: #aaaaaa; display: inline-block; width: 80px;">Nama:</span> 
                      <span style="${getFieldStyle('NamaLengkap')}">${p.namaLengkap}</span>
                      ${getErrorText('NamaLengkap')}
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                      <span style="color: #aaaaaa; display: inline-block; width: 80px;">IGN:</span> 
                      <span style="${getFieldStyle('IGN')}">${p.ign}</span>
                      ${getErrorText('IGN')}
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                      <span style="color: #aaaaaa; display: inline-block; width: 80px;">Duel ID:</span> 
                      <span style="${getFieldStyle('DuelID')}">${p.duelId}</span>
                      ${getErrorText('DuelID')}
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                      <span style="color: #aaaaaa; display: inline-block; width: 80px;">Discord:</span> 
                      <span style="${getFieldStyle('Discord')}">@${p.discord}</span>
                      ${getErrorText('Discord')}
                    </div>
                  </div>
                </div>
              `}).join('')}
            </div>
          ` : ''}
        </div>

        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Mohon kerjasamanya untuk segera melakukan penyesuaian agar tim Anda dapat lolos tahap verifikasi administrasi dan bermain di Season 7.
        </p>

        <div style="background-color: #1e1e1e; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px solid #333; border-left: 4px solid ${data.warna || '#5865F2'};">
          <p style="color: #ffffff; font-size: 14px; margin-bottom: 15px; font-weight: bold;">Gunakan link akses rahasia Anda di bawah ini untuk mengedit data:</p>
          <a href="https://teamwars.web.id/edit-team/${data.editToken}" style="background-color: #AA1348; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; letter-spacing: 1px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            ⚙️ SESUAIKAN DATA TIM SEKARANG
          </a>
        </div>

      </div>
      
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
// 3. API ROUTE: EKSEKUTOR AUDIT
// ==========================================
export async function GET() {
  try {
    const teams = await kv.smembers("global:teams");
    const auditResults: any[] = [];
    let emailsSent = 0;

    for (const slug of teams) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData) continue;

      const teamErrors: { value: string; error: string; rule: string }[] = [];
      const playerErrors: any[] = [];

      // 🎯 Pengecekan Nama Tim
      const teamNameErr = validateTeamName(teamData.namaTim);
      if (teamNameErr) {
        teamErrors.push({
          value: teamData.namaTim,
          error: teamNameErr,
          rule: "Regulasi Pendaftaran Team Wars Indonesia"
        });
      }

      if (teamData.players) {
        const parsedPlayers = typeof teamData.players === "string" ? JSON.parse(teamData.players) : teamData.players;
        let ketuaName = "Kapten";

        for (const p of parsedPlayers) {
          if (p.role === "Ketua") ketuaName = p.namaLengkap || p.ign;

          const pIssues: { field: string; error: string; rule: string }[] = [];
          
          // 🎯 Pengecekan per Field beserta atribusi Aturan Resminya
          const realNameErr = validateRealName(p.namaLengkap);
          if (realNameErr) {
            pIssues.push({ 
              field: 'NamaLengkap', 
              error: realNameErr, 
              rule: "Aturan Pencatatan Dokumen Kependudukan RI (Permendagri)" 
            });
          }
          
          const ignErr = validateIGN(p.ign);
          if (ignErr) {
            pIssues.push({ 
              field: 'IGN', 
              error: ignErr, 
              rule: "Format Karakter Yu-Gi-Oh! Duel Links (Konami)" 
            });
          }
          
          const duelIdErr = validateDuelId(p.idDuelLinks || p.duelId);
          if (duelIdErr) {
            pIssues.push({ 
              field: 'DuelID', 
              error: duelIdErr, 
              rule: "Format Standar ID Yu-Gi-Oh! Duel Links (Konami)" 
            });
          }
          
          const discordErr = validateDiscord(p.discord);
          if (discordErr) {
            pIssues.push({ 
              field: 'Discord', 
              error: discordErr, 
              rule: "Panduan Komunitas & Penamaan Username Discord" 
            });
          }

          // Jika ada minimal 1 field yang salah, masukkan seluruh data pemain ini
          if (pIssues.length > 0) {
            playerErrors.push({ 
              role: p.role,
              namaLengkap: p.namaLengkap || "-",
              ign: p.ign || "-",
              duelId: p.idDuelLinks || p.duelId || "-",
              discord: p.discord || "-",
              issues: pIssues 
            });
          }
        }
        teamData._ketuaName = ketuaName; 
      }

      if (teamErrors.length > 0 || playerErrors.length > 0) {
        auditResults.push({
          namaTim: teamData.namaTim,
          teamErrors,
          playerErrors
        });

        if (teamData.editToken && teamData.email) {
          try {
            await resend.emails.send({
              from: 'Team Wars Indonesia <registration@teamwars.web.id>',
              to: teamData.email
              subject: `[PERLU TINDAKAN] Verifikasi Data Tim ${teamData.namaTim} - TWI S7`,
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
            console.error(`Gagal kirim email audit tim ${teamData.namaTim}:`, emailErr);
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
