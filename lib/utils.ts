import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Gabungan Class untuk Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Pembersih spasi berlebih global (misal: "  Budi    Utomo " -> "Budi Utomo")
export const trimSpaces = (value: string): string => {
  return value.replace(/\s+/g, " ").trim()
}
