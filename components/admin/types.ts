export type Player = {
  ign: string;
  discord: string;
  discordId?: string;
};

export type TeamData = {
  id: string; // ID unik tim (tanpa prefix "teams:")
  namaTim: string;
  email: string;
  logoTim: string | null;
  buktiTransfer: string | null;
  players: Player[];
  editToken: string | null;
  warna: string;
  statusVerifikasi: string;
};
