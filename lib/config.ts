// Waktu Buka: 7 Juli 2026
export const LAUNCH_TARGET_DATE = "2026-07-07T17:44:00+07:00"
export const LAUNCH_TARGET = new Date(LAUNCH_TARGET_DATE).getTime()

// Waktu Tutup: 31 Juli 2026, 07.31.26 WIB
export const CLOSE_TARGET_DATE = "2026-07-31T20:26:31+07:00"
export const CLOSE_TARGET = new Date(CLOSE_TARGET_DATE).getTime()

// Cukup ubah di sini saja jika domain berubah
const DOMAIN = "teamwars.web.id";

// Konfigurasi Email
export const EMAIL_CONFIG = {
  // Format utama untuk digunakan di fungsi pengiriman Resend
  sender: `Team Wars Indonesia <registration@${DOMAIN}>`
};


export const DISCORD_CONFIG = {
  // 🛡️ ROLES
  BOT_ROLE_ID: '1521016621597065309', 
  ROLE_VERIFIED: '1166693043756343397',
  ROLE_DUELIST: '1525761725901570158',
  ROLE_KETUA: '610109155465756692',
  ROLE_WAKIL: '1173455029814952006',
  ROLE_ADMIN: '1144271761488216134',
  ROLE_REFEREE: '604079443647922197',
  ROLE_FINANCE: '836952890991968266',    // Baru dipindah dari registration.ts
  ROLE_CREATIVE: '1171096454685794324',     // Baru dipindah dari registration.ts

  // 📂 KATEGORI
  CT_TEAM_ID: '1521074286574567504',
  CT_MATCH_ID: '1527913792976064554', 

  // 💬 CHANNELS
  CH_BUKTI: '610460187878359041',
  CH_LOGO: '636461597216342026',
  CH_ROSTER: '1528639499532370091',

  // Channel khusus testing/wasit
  CH_REFEREE: '610153245955850240',

  // Pusat CCTV (Tim Daftar & Klaim Role)
  CH_LOG: '1525775643168735344',

  // Guild ID
  GUILD_ID: '458835709030039553',
};
