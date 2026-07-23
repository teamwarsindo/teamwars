import { trimSpaces } from "./utils"

// --- EMAIL & HEX ---
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim())
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

export function sanitizeHex(value: string): string {
  if (!value) return ""
  
  // 1. Ekstrak HANYA karakter yang valid untuk Hex (0-9, A-F)
  const hexPart = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  
  // 2. Jika user menghapus semuanya (termasuk #), biarkan kotak kosong
  if (!hexPart && !value.includes("#")) return ""; 
  
  // 3. Kunci secara paksa: Selalu tambahkan # di depan, dan potong maksimal 6 karakter
  return "#" + hexPart.slice(0, 6);
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
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
}

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
  
  // Mencegah titik ganda berurutan sesuai aturan
  if (v.includes("..")) return "Tidak boleh ada titik berurutan (..)."
  
  // 🎯 UPDATE: Validasi titik di awal/akhir sudah dicabut sesuai permintaan lu
  
  // Hanya memperbolehkan huruf, angka, underscore, dan titik
  if (!/^[a-zA-Z0-9_.]+$/.test(v)) return "Hanya boleh huruf, angka, _, dan ."
  return undefined
}

// --- REAL NAME ---
export function sanitizeRealName(value: string): string {
  return value.replace(/\s+/g, " ").trimStart()
}

export function toProperCase(value: string): string {
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
  
  // 🎯 UPDATE: Tambahkan titik (.) ke dalam regex agar "M." atau "Tb." bisa lolos
  if (/[^a-zA-Z\s'.-]/.test(v)) return "Hanya boleh huruf, spasi, titik, tanda kutip, dan strip."
  
  // 🎯 PENGAMAN TAMBAHAN: Biar gak aneh-aneh nulisnya
  if (v.includes("..")) return "Tidak boleh ada titik berurutan."
  if (v.startsWith(".")) return "Nama tidak boleh diawali dengan titik."
  
  return undefined
}
