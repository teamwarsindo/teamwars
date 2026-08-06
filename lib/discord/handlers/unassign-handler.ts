import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return isAdmin || (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) || (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF));
}

export async function handleUnassignCommand(interaction: any) {
  if (!isAuth(interaction)) return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value;

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) return { type: 4, data: { content: '❌ Match tidak ditemukan!', flags: 64 } };

  const match = schedules[idx];
  if (assignType === 'REFEREE') {
    delete match.referee;
    delete match.refereeDiscordId;
  } else {
    delete match.streamer;
    delete match.caster;
    delete match.streamerDiscordId;
    delete match.casterDiscordId;
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  // Sync Internal
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
  fetch(`${origin}/api/tournament/sync-match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: match.id }) }).catch(() => null);

  return { type: 4, data: { content: `🗑️ Penugasan ${assignType === 'REFEREE' ? 'Referee' : 'Streamer'} di match **${match.id}** berhasil dicabut.`, flags: 64 } };
                                                     }
                     
