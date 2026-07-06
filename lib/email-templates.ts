export function getPesertaTemplate(data: { namaTim: string; warna: string; ketua: any; wakil: any; totalRoster: number }) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #333;">
      <div style="background-color: #000000; padding: 30px 20px; text-align: center; border-bottom: 3px solid ${data.warna};">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">TEAM WARS INDONESIA</h1>
        <p style="margin: 5px 0 0 0; color: #aaaaaa; font-size: 14px;">SEASON 7 REGISTRATION</p>
      </div>
      <div style="padding: 30px 20px;">
        <h2 style="margin-top: 0; color: #ffffff;">Halo, ${data.ketua.namaLengkap}!</h2>
        <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
          Pendaftaran tim <strong>${data.namaTim.toUpperCase()}</strong> telah berhasil kami terima dan sedang masuk ke dalam antrean verifikasi panitia.
        </p>
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${data.warna};">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 10px;">Ringkasan Data Tim</h3>
          <table style="width: 100%; color: #cccccc; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; width: 40%;"><strong>Nama Tim</strong></td>
              <td style="padding: 5px 0;">: ${data.namaTim.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Kapten (Ketua)</strong></td>
              <td style="padding: 5px 0;">: ${data.ketua.namaLengkap}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Wakil Kapten</strong></td>
              <td style="padding: 5px 0;">: ${data.wakil.namaLengkap}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Total Roster</strong></td>
              <td style="padding: 5px 0;">: ${data.totalRoster} Pemain</td>
            </tr>
          </table>
        </div>
        <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">
          Tim panitia akan melakukan validasi bukti transfer dan logo tim. Jika semuanya aman, channel Discord khusus tim kalian akan segera aktif. Harap bersabar dan pantau terus server Discord TWI!
        </p>
      </div>
      <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #333;">
        <p style="margin: 0; color: #666666; font-size: 12px;">Email ini dibuat otomatis oleh Sistem Registrasi TWI S7.<br>Mohon tidak membalas email ini.</p>
      </div>
    </div>
  `;
}
