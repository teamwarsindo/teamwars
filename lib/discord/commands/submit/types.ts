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

export function isStaff(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    const permissions = BigInt(member?.permissions || '0');
    const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);
    return (
      isAdmin ||
      (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
      (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF)) ||
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
