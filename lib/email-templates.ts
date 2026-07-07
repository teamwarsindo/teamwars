// Helper untuk Proper Case
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

  // Logika Sorting Roster: Ketua (1) -> Wakil Ketua (2) -> Anggota (3)
  const roleWeights: Record<string, number> = { "Ketua": 1, "Wakil Ketua": 2, "Anggota": 3 };
  const sortedPlayers = [...data.players].sort((a, b) => {
    const weightA = roleWeights[a.role] || 99;
    const weightB = roleWeights[b.role] || 99;
    return weightA - weightB;
  });

  return `
    <!-- BORDER UTAMA MENGGUNAKAN WARNA HEX TIM -->
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 2px solid ${data.warna};">
      
      <!-- HEADER MENGGUNAKAN WARNA HEX TIM -->
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 2px solid ${data.warna};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 REGISTRATION</p>
      </div>
      
      <div style="padding: 30px 20px;">
        
        <!-- BANNER STATUS PENDING -->
        <div style="background-color: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; color: #ffc107; padding: 12px; border-radius: 6px; text-align: center; margin-bottom: 25px; font-weight: bold; letter-spacing: 1px; font-size: 14px;">
          ⏳ STATUS: PENDING (Menunggu Konfirmasi Tim Finance)
        </div>

        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px;">Halo, ${data.ketua.namaLengkap}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 15px;">
          Pendaftaran tim <strong>${properTeamName}</strong> telah berhasil kami terima pada <strong>${submitTime}</strong>.
        </p>
        
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${data.warna};">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Aset Visual & Pembayaran</h3>
          
          <!-- Penambahan Label Warna Hex -->
          <div style="text-align: center; margin-top: 15px; margin-bottom: 15px;">
            <span style="display: block; color: #aaaaaa; font-size: 12px; margin-bottom: 5px; font-weight: bold;">KODE WARNA TIM</span>
            <div style="display: inline-block; background-color: ${data.warna}; padding: 5px 15px; border-radius: 4px; color: #fff; text-shadow: 1px 1px 2px #000; font-weight: bold; font-family: monospace;">
              ${data.warna}
            </div>
          </div>

          <table style="width: 100%; margin-top: 15px; table-layout: fixed;">
            <tr>
              <td style="text-align: center; width: 50%; padding-right: 5px;">
                <span style="display: block; color: #aaaaaa; font-size: 12px; margin-bottom: 8px; font-weight: bold;">LOGO TIM</span>
                <img src="${data.logoTim}" alt="Logo Tim" style="max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: contain; background-color: #000;" />
              </td>
              <td style="text-align: center; width: 50%; padding-left: 5px;">
                <span style="display: block; color: #aaaaaa; font-size: 12px; margin-bottom: 8px; font-weight: bold;">BUKTI TRANSFER</span>
                <img src="${data.buktiTransfer}" alt="Bukti Transfer" style="max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: contain;" />
              </td>
            </tr>
          </table>
        </div>

        <!-- WRAPPER TABEL RESPONSIVE (Mencegah teks tergencet di HP) -->
        <div style="background-color: #1e1e1e; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${data.warna}; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px; white-space: nowrap;">Roster Lengkap (${data.totalRoster} Pemain)</h3>
          
          <!-- TABEL DENGAN MIN-WIDTH (Bisa digeser ke kanan di layar kecil) -->
          <table style="width: 100%; color: #cccccc; text-align: left; border-collapse: collapse; margin-top: 10px; min-width: 550px;">
            <thead>
              <tr style="color: #aaaaaa; border-bottom: 1px solid #333; font-size: 11px;">
                <th style="padding: 8px 4px; width: 22%;">Nama Asli</th>
                <th style="padding: 8px 4px; width: 20%;">IGN</th>
                <th style="padding: 8px 4px; width: 22%;">Duel ID</th>
                <th style="padding: 8px 4px; width: 20%;">Discord</th>
                <th style="padding: 8px 4px; width: 16%; text-align: right;">Role</th>
              </tr>
            </thead>
            <tbody>
              ${sortedPlayers.map(p => `
                <tr style="border-bottom: 1px solid #222; font-size: 12px;">
                  <td style="padding: 10px 4px; color: #ddd; word-break: break-word;">${p.namaLengkap}</td>
                  <td style="padding: 10px 4px; color: #fff; font-weight: bold; word-break: break-word;">${p.ign}</td>
                  <td style="padding: 10px 4px; font-family: monospace; font-size: 11px;">${p.idDuelLinks || p.duelId}</td>
                  <td style="padding: 10px 4px; font-size: 11px; word-break: break-word;">@${p.discord}</td>
                  <td style="padding: 10px 4px; text-align: right; font-weight: ${p.role !== 'Anggota' ? 'bold' : 'normal'}; color: ${p.role !== 'Anggota' ? data.warna : '#ccc'}; font-size: 11px;">${p.role}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <p style="color: #cccccc; line-height: 1.6; font-size: 14px; text-align: center;">
          Harap tunggu konfirmasi dari tim Finance kami. Jika pembayaran valid, instruksi selanjutnya dan akses ke channel Discord khusus tim kalian akan segera dikirimkan.
        </p>
      </div>
      
      <!-- FOOTER MENGGUNAKAN WARNA HEX TIM & COPYRIGHT BARU -->
      <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 2px solid ${data.warna};">
        <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.8;">
          Email ini dibuat otomatis oleh Sistem Registrasi TWI S7.<br>
          Mohon tidak membalas email ini.<br>
          <strong style="color: #888888;">&copy; 2026 Team Wars Indonesia. All rights reserved.</strong>
        </p>
      </div>

    </div>
  `;
                }
