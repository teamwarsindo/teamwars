import { kv } from '@vercel/kv';

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId: string;
  ign: string;
  idDuelLinks: string;
  teamsJoinedCount?: number;
}

export interface TeamKVData {
  [key: string]: unknown;
  namaTim: string;
  warna: string;
  logoTim?: string;
  createdAt?: string;
  updatedAt?: string;
  discordRoleId?: string;
  discordChannelId?: string;
  trackerMsgId?: string;
  adminMsgId?: string;
  transferQuotaUsed?: number;
  kodeTim?: string;
  emojiId?: string;
  players: string | PlayerItem[];
}

export interface FreeDuelistRecord {
  [key: string]: unknown;
  discord: string;
  discordId: string;
  idDuelLinks: string;
  ign: string;
  lastTeam: string;
  releasedAt: string;
  teamsJoinedCount: number;
}

export function formatDuelId(input: string): string {
  if (!input) return '-';
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 9) return input.trim();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
}

export function cleanDuelId(input: string): string {
  return (input || '').replace(/\D/g, '');
}

export function parsePlayers(playersData: any): PlayerItem[] {
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

export async function getTeamBySlug(slug: string): Promise<{ key: string; data: TeamKVData } | null> {
  const key = `teams:${slug}`;
  const data = await kv.hgetall<TeamKVData>(key);
  if (!data || !data.namaTim) return null;
  return { key, data };
}

export function findPlayerIndex(players: PlayerItem[], targetInput: string): number {
  if (!targetInput) return -1;
  const targetClean = targetInput.trim().toLowerCase();
  return players.findIndex(
    (p) =>
      (p.ign && p.ign.toLowerCase() === targetClean) ||
      (p.discordId && p.discordId.toLowerCase() === targetClean) ||
      (p.discord && p.discord.toLowerCase() === targetClean)
  );
}
