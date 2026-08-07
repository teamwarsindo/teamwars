import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { StaffItem } from './autocomplete-handler';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return isAdmin || (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) || (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF));
}

export async function handleAssignCommand(interaction: any) {
  if (!isAuth(interaction)) return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value;
  const targetId = opts.find((o: any) => o.name === 'user')?.value;

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) return { type: 4, data: { content: '❌ Match tidak ditemukan!', flags: 64 } };

  const match = schedules[idx];
  const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

  // Proteksi Lock: Cek apakah staf sudah ditugaskan di match lain
  const busyMatch = schedules.find((m) => (assignType === 'REFEREE' ? m.refereeDiscordId === targetId : (m.streamerDiscordId || m.casterDiscordId) === targetId));
  if (busyMatch) {
    return {
      type: 4,
      data: { content: `⛔ Staf ini sudah terdaftar di match **${busyMatch.id}** (${busyMatch.teamAName} vs ${busyMatch.teamBName}). Gunakan \`/unassign\` dulu!`, flags: 64 },
    };
  }

  // Simpan data
  const staffList = (await kv.get<StaffItem[]>(assignType === 'STREAMER' ? 'staff:streamers' : 'staff:referees')) || [];
  const staff = staffList.find((s) => s.discordId === targetId);
  const staffName = staff?.discordName || `<@${targetId}>`;

  if (assignType === 'REFEREE') {
    match.referee = staffName;
    match.refereeDiscordId = targetId;
  } else {
    match.streamer = match.caster = staffName;
    match.streamerDiscordId = match.casterDiscordId = targetId;
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  // Sync Internal
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
  fetch(`${origin}/api/tournament/sync-match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: match.id }) }).catch(() => null);

  return { type: 4, data: { content: `✅ **${staffName}** berhasil ditugaskan sebagai **${roleTitle}** untuk match **${match.id}**!`, flags: 64 } };
      }
