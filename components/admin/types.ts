export type Player = {
  ign: string
  discord: string
  discordId?: string
}

export type TeamData = {
  id: string
  namaTim: string
  email: string
  kaptenDiscord: string
  kaptenIgn: string
  statusVerifikasi: string
  createdAt: string | number
  warna: string
  logoTim: string | null
  buktiTransfer: string | null
  playersCount: number
  players: Player[]
  editToken: string | null
  discordRoleId: string | null
}
