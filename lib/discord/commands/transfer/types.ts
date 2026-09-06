import { kv } from '@vercel/kv';
import { isValidSnowflake, parsePlayers, PlayerItem } from '@/lib/discord/utils';

// Re-export agar sub-command di folder transfer tetap kompatibel
export { parsePlayers, type PlayerItem };

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

export interface TransferContext {
  interaction: any;
  actorId: string;
  actorRoleText: string;
  isAdmin: boolean;
  isKetua: boolean;
  isWakil: boolean;
  channelId: string;
  token: string;
  appId: string;
  teamSlug: string;
  teamName: string;
  teamData: TeamKVData;
  opts: any[];
}

// ── Utilitas Format & Query Transfer ────────────────────────────

export function formatDuelId(input: string): string {
  if (!input) return '-';
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 9) return input.trim();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
}

export function cleanDuelId(input: string): string {
  return (input || '').replace(/\D/g, '');
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

export async function getTeamBySlug(slug: string): Promise<{ key: string; data: TeamKVData } | null> {
  const key = `teams:${slug}`;
  const data = await kv.hgetall<TeamKVData>(key);
  if (!data || !data.namaTim) return null;
  return { key, data };
}

// 🔍 Resolusi Tunggal Discord ID (Fallback global:verified_users)
export async function resolveDiscordId(discordUsername?: string, existingId?: string): Promise<string | null> {
  if (existingId && isValidSnowflake(existingId)) return existingId;
  if (!discordUsername) return null;

  const clean = discordUsername.trim();
  if (isValidSnowflake(clean)) return clean;

  const cleanUsername = clean.toLowerCase().replace(/^@/, '');
  const id = await kv.hget<string>('global:verified_users', cleanUsername);
  return id && isValidSnowflake(id) ? id : null;
}

export function getSubcommandData(interaction: any) {
  const options = interaction.data?.options || [];
  const subcommandObj = options.find((o: any) => o.type === 1);
  if (!subcommandObj) return { subcommand: null, opts: [] };
  return {
    subcommand: subcommandObj.name,
    opts: subcommandObj.options || [],
  };
}

export function getWibTimestamp(): string {
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date()) + ' WIB'
  );
}
