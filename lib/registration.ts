export type RosterRole = "Ketua" | "Wakil Ketua" | "Anggota"
export const ROSTER_ROLES: RosterRole[] = ["Ketua", "Wakil Ketua", "Anggota"]

export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 10
export const STORAGE_KEY = "twi-s7-duel-links-draft"

export interface Player {
  id: string
  role: RosterRole
  namaLengkap: string
  discord: string
  ign: string
  duelId: string
}

export interface UploadedFile {
  url: string; // Menyimpan URL Cloudinary
  name: string;
  size?: number;
}

export function createPlayer(role: RosterRole): Player {
  return { 
    id: crypto.randomUUID(), 
    role, 
    namaLengkap: "", 
    discord: "", 
    ign: "", 
    duelId: "" 
  }
}

export function defaultPlayers(): Player[] {
  return [
    createPlayer("Ketua"), 
    createPlayer("Wakil Ketua"), 
    createPlayer("Anggota"), 
    createPlayer("Anggota"), 
    createPlayer("Anggota")
  ]
}

export function countRole(players: Player[], role: RosterRole): number {
  return players.filter((p) => p.role === role).length
}

export function assignRole(players: Player[], targetId: string, nextRole: RosterRole): Player[] {
  const isUnique = nextRole === "Ketua" || nextRole === "Wakil Ketua"
  return players.map((p) => {
    if (p.id === targetId) return { ...p, role: nextRole }
    if (isUnique && p.role === nextRole) return { ...p, role: "Anggota" }
    return p
  })
}
