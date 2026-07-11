import { trimSpaces } from "./utils"

// --- EMAIL & HEX ---
export function isValidEmail(value: string): boolean {
  // Perbaikan: Pastikan domain belakang (TLD) minimal 2 karakter abjad (misal .com, .id)
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim())
}

export function isValidHex(value: string): boolean {
  // Tetap ketat: Wajib tanda pagar dan tepat 6 karakter alfanumerik hex
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

export function sanitizeHex(value: string): string {
  if (!value) return ""
  const hasHash = value.startsWith("#") ? value : "#" + value;
  // Biarkan input masuk apa adanya (hanya hapus spasi & ubah ke kapital), 
  // agar isValidHex bisa menangkap kalau user ngetik kepanjangan/salah huruf.
  return hasHash.replace(/\s+/g, "").toUpperCase()
}

// --- ID DUEL LINKS ---
export function formatDuelId(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  
  if (digits.length <= 9) {
    const parts: string[] = []
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3))
    }
    return parts.join("-")
  } else {
    // Jika lebih dari 9 angka, 9 angka pertama diformat normal, sisanya ditumpuk di akhir
    // Contoh: 123456789000 -> 123-456-789000
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
}

// Menggantikan isCompleteDuelId agar seirama dengan validasi lain (mengembalikan string error)
export function validateDuelId(value: string): string | undefined {
  const digits = value.replace(/\D/g, "")
  if (!digits) return "ID Duel Links wajib diisi."
  if (digits.length < 9) return "ID kurang dari 9 angka."
  if (digits.length > 9) return "ID maksimal 9 angka."
  return undefined
}

// --- IGN DUEL LINKS ---
export function sanitizeIGN(value: string): string {
  return value.replace(/\s+/g, " ").trimStart()
}

export function validateIGN(value: string): string | undefined {
  const v = value.trim()
  if (!v) return "IGN wajib diisi."
  if (v.length < 3) return "Minimal 3 karakter."
  if (v.length > 12) return "Maksimal 12 karakter."
  
  // \x20-\x7E adalah kode ASCII dari spasi hingga tilde (~). 
  // Meloloskan abjad, angka, dan SEMUA simbol gboard standar (!@#$% dll).
  // Memblokir huruf Asia, Arab, Cyrillic, dan emoji.
  if (/[^\x20-\x7E]/.test(v)) return "IGN tidak boleh mengandung emoji atau huruf asing."
  return undefined
}

// --- TEAM NAME ---
export function sanitizeTeamName(value: string): string {
  return value.replace(/\s+/g, " ").trimStart()
}

export function validateTeamName(value: string): string | undefined {
  const v = value.trim()
  if (!v) return "Nama Tim wajib diisi."
  if (v.length < 3) return "Minimal 3 karakter."
  if (v.startsWith(".") || v.endsWith(".")) return "Tidak boleh diawali/diakhiri titik."
  if (/[^a-zA-Z0-9 .'-]/.test(v)) return "Hanya boleh huruf, angka, spasi, titik, tanda kutip, dan strip."
  return undefined
}

// --- DISCORD ---
export function sanitizeDiscord(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "")
}

export function validateDiscord(value: string): string | undefined {
  const v = value.trim()
  if (!v) return "Discord wajib diisi."
  if (v.length < 2) return "Minimal 2 karakter."
  if (v.length > 32) return "Maksimal 32 karakter."
  if (v.includes("..")) return "Tidak boleh ada titik berurutan (..)."
  if (v.startsWith(".") || v.endsWith(".")) return "Tidak boleh diawali/diakhiri titik."
  if (!/^[a-zA-Z0-9_.]+$/.test(v)) return "Hanya boleh huruf, angka, _, dan ."
  return undefined
}

// --- REAL NAME ---
export function sanitizeRealName(value: string): string {
  return value.replace(/\s+/g, " ").trimStart()
}

export function toProperCase(value: string): string {
  // Tetap mempertahankan D'angelo (huruf a kecil setelah kutip).
  return trimSpaces(value)
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}

export function validateRealName(value: string): string | undefined {
  const v = trimSpaces(value)
  if (!v) return "Nama wajib diisi."
  if (v.length < 3) return "Minimal 3 karakter."
  if (v.length > 60) return "Maksimal 60 karakter."
  if (/[^a-zA-Z\s'-]/.test(v)) return "Hanya boleh menggunakan abjad, spasi, tanda kutip, dan strip."
  return undefined
}
