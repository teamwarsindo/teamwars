// Helper untuk Proper Case (Contoh: "TEAM WARS" -> "Team Wars")
function toProperCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

// Helper untuk waktu WIB
function getWIBTime() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "medium"
  }) + " WIB";
}

export function getPesertaTemplate(data: { 
  namaTim: string; 
  warna: string; 
  ketua: any; 
  wakil: any; 
  totalRoster: number;
  logoTim: string;
  buktiTransfer: string;
  players: any[];
}) {
  const properTeamName = toProperCase(data.namaTim);
  const submitTime = getWIBTime();

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #333;">
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 3px solid ${data.warna};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 REGISTRATION</p>
      </div>
      <div style="padding: 30px 20px;">
        <h2 style="margin-top: 0; color: #ffffff;">Halo, ${data.ketua.namaLengkap}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
          Pendaftaran tim <strong>${properTeamName}</strong> telah berhasil kami terima pada <strong>${submitTime}</strong>.
        </p>
        
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${data.warna};">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Aset Visual & Pembayaran</h3>
          <table style="width: 100%; margin-top: 15px;">
            <tr>
              <td style="text-align: center; width: 50%; padding-right: 10px;">
                <span style="display: block; color: #aaaaaa; font-size: 12px; margin-bottom: 8px; font-weight: bold;">LOGO TIM</span>
                <img src="${data.logoTim}" alt="Logo Tim" style="max-width: 120px; max-height: 120px; border-radius: 8px; object-fit: contain; background-color: #000;" />
              </td>
              <td style="text-align: center; width: 50%; padding-left: 10px;">
                <span style="display: block; color: #aaaaaa; font-size: 12px; margin-bottom: 8px; font-weight: bold;">BUKTI TRANSFER</span>
                <img src="${data.buktiTransfer}" alt="Bukti Transfer" style="max-width: 150px; max-height: 120px; border-radius: 8px; object-fit: contain;" />
              </td>
            </tr>
          </table>
        </div>

        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${data.warna};">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Roster Lengkap (${data.totalRoster} Pemain)</h3>
          <table style="width: 100%; color: #cccccc; font-size: 13px; text-align: left; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="color: #aaaaaa; border-bottom: 1px solid #333;">
                <th style="padding: 8px 4px;">Role</th>
                <th style="padding: 8px 4px;">IGN</th>
                <th style="padding: 8px 4px;">Duel ID</th>
                <th style="padding: 8px 4px;">Discord</th>
              </tr>
            </thead>
            <tbody>
              ${data.players.map(p => `
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 10px 4px; font-weight: ${p.role !== 'Anggota' ? 'bold' : 'normal'}; color: ${p.role !== 'Anggota' ? data.warna : '#ccc'};">${p.role}</td>
                  <td style="padding: 10px 4px; color: #fff;">${p.ign}</td>
                  <td style="padding: 10px 4px; font-family: monospace;">${p.idDuelLinks || p.duelId}</td>
                  <td style="padding: 10px 4px;">@${p.discord}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <p style="color: #cccccc; line-height: 1.6; font-size: 14px; text-align: center;">
          Tim panitia akan melakukan validasi. Jika semuanya aman, channel Discord khusus tim kalian akan segera aktif. Pantau terus server Discord TWI!
        </p>
      </div>
      <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #333;">
        <p style="margin: 0; color: #666666; font-size: 12px;">Email ini dibuat otomatis oleh Sistem Registrasi TWI S7.<br>Mohon tidak membalas email ini.</p>
      </div>
    </div>
  `;
}
