export type Player = {
  ign: string;
  discord: string;
  discordId?: string;
  duelId?: string;
  isVerified?: boolean; // 👈 Kolom validasi per individu
};

export type TeamData = {
  id: string;
  namaTim: string;
  email: string;
  hex: string;
  logoTim: string | null;
  buktiTransfer: string | null;
  players: Player[];
  editToken: string | null;
  statusVerifikasi: string;
};
