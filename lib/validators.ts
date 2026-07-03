import { trimSpaces } from "./utils"

// --- EMAIL & HEX ---
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}
export function sanitizeHex(value: string): string {
  if (!value) return ""
  // Bersihkan karakter non-hex dan langsung paksa uppercase
  const cleanHex = value.replace(/#/g, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
  return "#" + cleanHex.toUpperCase()
}


// --- ID DUEL LINKS ---
export function formatDuelId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9)
  const parts: string[] = []
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3))
  }
  return parts.join("-")
}
export function isCompleteDuelId(value: string): boolean {
  return /^\d{3}-\d{3}-\d{3}$/.test(value)
}

// --- TEAM NAME ---
export function sanitizeTeamName(value: string): string {
  return value.replace(/[^a-zA-Z0-9 .'-]/g, "")
}
export function validateTeamName(value: string): string | undefined {
  const v = value.trim()
  if (!v) return "Nama Tim wajib diisi."
  if (v.length < 3) return "Minimal 3 karakter."
  if (v.startsWith(".") || v.endsWith(".")) return "Tidak boleh diawali/diakhiri titik."
  return undefined
}

// --- DISCORD ---
export function sanitizeDiscord(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 32)
}
export function validateDiscord(value: string): string | undefined {
  const v = value.trim()
  if (!v) return "Discord wajib diisi."
  if (v.length < 2) return "Minimal 2 karakter."
  if (v.length > 32) return "Maksimal 32 karakter."
  if (v.includes("..")) return "Tidak boleh ada titik berurutan (..)."
  if (v.startsWith(".") || v.endsWith(".")) return "Tidak boleh diawali/diakhiri titik."
  if (!/^[a-z0-9_.]+$/.test(v)) return "Hanya huruf kecil, angka, _, dan ."
  return undefined
}

// --- REAL NAME (Gabungan Logika) ---
export function sanitizeRealName(value: string): string {
  return value.replace(/[^a-zA-Z\s'-]/g, "").slice(0, 60)
}
// Konversi otomatis ke huruf kapital di tiap kata awal (Budi Utomo)
export function toProperCase(value: string): string {
  return trimSpaces(value)
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}
export function validateRealName(value: string): string | undefined {
  const v = trimSpaces(value)
  if (!v) return "Nama wajib diisi."
  if (v.split(/\s+/).length < 2) return "Nama wajib menggunakan nama asli (minimal 2 kata)."
  if (v.length < 3) return "Minimal 3 karakter."
  if (v.length > 60) return "Maksimal 60 karakter."
  return undefined
}
