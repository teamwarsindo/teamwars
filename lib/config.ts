// Waktu Buka: 7 Juli 2026
export const LAUNCH_TARGET_DATE = "2026-07-07T17:44:00+07:00"
export const LAUNCH_TARGET = new Date(LAUNCH_TARGET_DATE).getTime()

// Waktu Tutup: 31 Juli 2026, 07.31.26 WIB
export const CLOSE_TARGET_DATE = "2026-07-31T07:31:26+07:00"
export const CLOSE_TARGET = new Date(CLOSE_TARGET_DATE).getTime()

// Cukup ubah di sini saja jika domain berubah
const DOMAIN = "teamwars.web.id";

// Konfigurasi Email
export const EMAIL_CONFIG = {
  from: {
    name: "Team Wars Indonesia",
    email: `registration@${DOMAIN}`, // Pakai backtick agar variabel terbaca
  },
  // Format untuk digunakan di fungsi pengiriman
  sender: `Team Wars Indonesia <registration@${DOMAIN}>`, 
  
  // Daftar tujuan email internal
  to: {
    finance: `finance@${DOMAIN}`,
    creative: `creative@${DOMAIN}`,
    admin: `admin@${DOMAIN}`,
  }
};
