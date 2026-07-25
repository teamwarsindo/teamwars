import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import nacl from 'tweetnacl'

// Gabungan Class untuk Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Pembersih spasi berlebih global (misal: "  Budi    Utomo " -> "Budi Utomo")
export const trimSpaces = (value: string): string => {
  return value.replace(/\s+/g, " ").trim()
}

export const toProperCase = (str: string) =>
  str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase())

export const getWIBTime = () =>
  new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "medium"
  }) + " WIB";
