export const getPesertaTemplate = ({ namaTim, warna, ketua, wakil, logoTim, buktiTransfer, players }: any) => {
  // Karena logoTim dan buktiTransfer sekarang murni string URL dari Cloudinary,
  // Kita bisa langsung pakai trik replace buat optimasi ukuran gambar di email.
  const logoSrc = typeof logoTim === 'string' 
    ? logoTim.replace('/upload/', '/upload/c_fill,w_160,h_160,f_png,q_auto/') 
    : '/placeholder.svg';

  const hexColor = warna || '#3b82f6';

  return `
  <div style="background-color: #020817; padding: 30px 15px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      
      <div style="border-bottom: 4px solid ${hexColor}; padding: 25px 30px; text-align: center; background-color: #1e293b; position: relative;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">TEAMWARS S7</h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Registrasi Diterima</p>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; margin-top: 0; color: #f1f5f9;">Sistem kami telah menerima pendaftaran <strong>Tim ${namaTim}</strong>. 🔥</p>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 25px;">Berikut adalah rekap data pendaftaran yang akan diteruskan ke Tim Verifikator kami.</p>
        
        <div style="background-color: #020817; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #e2e8f0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">Identitas Tim</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #cbd5e1;">
            <tr><td style="padding: 6px 0; width: 40%; color: #64748b;">Nama Tim</td><td>: <strong style="color: #ffffff;">${namaTim}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Kode Warna</td><td>: <span style="display:inline-block; width:12px; height:12px; background-color:${hexColor}; border-radius:3px; vertical-align:middle; margin-right:5px;"></span> <code style="color: #94a3b8;">${hexColor}</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Ketua</td><td>: ${ketua.namaLengkap} <code style="color: #3b82f6; font-size: 12px;">(@${ketua.discord})</code></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Wakil Ketua</td><td>: ${wakil.namaLengkap} <code style="color: #3b82f6; font-size: 12px;">(@${wakil.discord})</code></td></tr>
          </table>
        </div>

        <table style="width: 100%; margin-bottom: 25px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 50%; padding-right: 8px;">
              <div style="background-color: #020817; border: 1px solid #1e293b; border-radius: 8px; padding: 15px; text-align: center; height: 140px;">
                <p style="font-size: 11px; font-weight: bold; margin: 0 0 10px 0; color: #64748b; text-transform: uppercase;">Logo Tim</p>
                <img src="${logoSrc}" alt="Logo" style="width: 90px; height: 90px; border-radius: 8px; object-fit: cover; border: 2px solid ${hexColor}; background-color: #0f172a;" />
              </div>
            </td>
            <td style="width: 50%; padding-left: 8px;">
              <div style="background-color: #020817; border: 1px solid #1e293b; border-radius: 8px; padding: 15px; text-align: center; height: 140px;">
                <p style="font-size: 11px; font-weight: bold; margin: 0 0 10px 0; color: #64748b; text-transform: uppercase;">Bukti Transfer</p>
                <img src="${buktiTransfer}" alt="Transfer" style="max-width: 100%; height: 90px; object-fit: contain; border-radius: 4px;" />
              </div>
            </td>
          </tr>
        </table>

        <h3 style="margin: 0 0 10px 0; color: #e2e8f0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Roster Lengkap</h3>
        <div style="border: 1px solid #1e293b; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background-color: #020817;">
            <thead style="background-color: #1e293b;">
              <tr>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600;">Role</th>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600;">Pemain (IGN)</th>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600;">ID Duel Links</th>
              </tr>
            </thead>
            <tbody style="color: #cbd5e1;">
              ${players.map((p: any, index: number) => `
                <tr style="border-top: 1px solid #1e293b; background-color: ${index % 2 === 0 ? '#020817' : '#0a1020'};">
                  <td style="padding: 12px; font-weight: bold; color: ${p.role.includes('Ketua') ? hexColor : '#e2e8f0'};">${p.role}</td>
                  <td style="padding: 12px;">${p.namaLengkap}<br><span style="color: #64748b; font-size: 11px;">IGN: ${p.ign}</span></td>
                  <td style="padding: 12px; font-family: monospace; color: #38bdf8;">${p.duelId}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <p style="font-size: 13px; margin-top: 25px; line-height: 1.6; color: #94a3b8; text-align: center;">
          Mohon pastikan akun Discord yang terdaftar aktif. Tim verifikator kami (Admin & Finance) akan memproses data Anda 1x24 jam.
        </p>
      </div>
      
      <div style="background-color: #020817; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="font-size: 12px; color: #475569; margin: 0; font-weight: 600;">GLHF, SIAPKAN STRATEGI TERBAIKMU!</p>
      </div>
    </div>
  </div>
  `;
};
