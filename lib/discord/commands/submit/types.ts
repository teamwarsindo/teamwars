import { DISCORD_CONFIG } from '@/lib/discord/config';

export interface SubmitContext {
  interaction: any;
  channelId: string;
  matchId: string;
  teamKey: 'teamA' | 'teamB';
  campData: any;
  reportData: any;
  teamRoster: any[];
  optMap: Record<string, any>;
}

// 👑 Cek apakah user adalah Super Admin atau Chief (Bypass Batasan Waktu)
export function isAdminOrChief(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    const permissions = BigInt(member?.permissions || '0');
    const isDiscordAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);
    return (
      isDiscordAdmin ||
      (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
      (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
    );
  } catch {
    return false;
  }
}

// 🛡️ Cek apakah user adalah Staff (Referee / Admin / Chief)
export function isStaff(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    return (
      isAdminOrChief(interaction) ||
      (!!DISCORD_CONFIG.ROLE_REFEREE && roles.includes(DISCORD_CONFIG.ROLE_REFEREE))
    );
  } catch {
    return false;
  }
}

export function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) {
    map[opt.name] = opt.value;
  }
  return map;
}

export function isToday(dateIso?: string): boolean {
  if (!dateIso) return false;
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const match = new Date(dateIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return now === match;
}

// 📅 Validasi Kebal Admin: Aktif s/d Selasa pekan berikutnya (23:59:59 WIB)
export function isWithinAdminGracePeriod(matchDateIso?: string): boolean {
  if (!matchDateIso) return false;
  const matchDate = new Date(matchDateIso);
  if (isNaN(matchDate.getTime())) return false;

  const matchWib = new Date(matchDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const day = matchWib.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;

  // Minggu pekan match + 2 hari = Selasa pekan berikutnya
  const deadlineTuesday = new Date(matchWib);
  deadlineTuesday.setDate(matchWib.getDate() + daysUntilSunday + 2);
  deadlineTuesday.setHours(23, 59, 59, 999);

  const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return nowWib.getTime() <= deadlineTuesday.getTime();
}

export function parseIgnAndId(input: string): { ign: string; idDuelLinks: string } {
  const match = input.match(/^(.*?)(?:\s*\(([\d\-]+)\))?$/);
  if (!match) return { ign: input.trim(), idDuelLinks: '' };
  return {
    ign: match[1].trim(),
    idDuelLinks: (match[2] || '').trim(),
  };
}

export function createEmptyDeck() {
  return {
    archetype: '',
    skill: '',
    wins: 0,
    losses: 0,
    isDead: false,
    isRepeatUsed: false,
    lastGameNumber: null,
  };
}

export function createFilledDeck(archetype: string, skill: string = '') {
  return {
    archetype: archetype.trim(),
    skill: (skill || '').trim(),
    wins: 0,
    losses: 0,
    isDead: false,
    isRepeatUsed: false,
    lastGameNumber: null,
  };
}
