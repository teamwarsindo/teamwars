export interface PlayerState { 
  id: string; 
  role: string; // (Atau RosterRole jika kamu pakai Opsi 1 sebelumnya)
  namaLengkap: string; 
  discord: string; 
  ign: string; 
  duelId: string; 
}

export interface TeamState { 
  email: string; 
  namaTim: string; 
  hex: string; 
  logo: { url?: string } | null; 
  bukti: { url?: string } | null; 
  setEmail: (val: string) => void; 
  setNamaTim: (val: string) => void; 
  setHex: (val: string) => void; 
}

export interface RosterState { 
  players: PlayerState[]; 
  setPlayers: (players: PlayerState[]) => void; 
}

export interface BackendError { 
  field: string; 
  message: string; 
}
