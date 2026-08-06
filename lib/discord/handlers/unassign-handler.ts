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
  const assignType = opts.find((o: any) => o.name === 'type')?.value; // 'REFEREE' | 'STREAMER'
  const reason = opts.find((o: any) => o.name === 'reason')?.value; // 'COMPLETED' | 'REPLACED'

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) return { type: 4, data: { content: '❌ Match tidak ditemukan!', flags: 64 } };

  const match = schedules[idx];
  const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

  // Ambil ID & Nama Staf Aktif
  const targetStaffId = assignType === 'REFEREE' 
    ? match.refereeDiscordId 
    : (match.streamerDiscordId || match.casterDiscordId);

  const targetStaffName = assignType === 'REFEREE' ? match.referee : match.streamer;

  if (!targetStaffId) {
    return {
      type: 4,
      data: { content: `⚠️ Tidak ada **${roleTitle}** yang terdaftar di match **${match.id}**.`, flags: 64 },
    };
  }

  // 💡 DATA DI REDIS MATCH (match.referee / match.streamer) TETAP DIBIARKAN ADA
  // Supaya Match Report & Rekapan di Web Admin tidak hilang/kosong.

  // TRIGGER SYNC-MATCH UNTUK CABUT ROLE DISCORD & LEPAS LOCK STAF
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
  try {
    await fetch(`${origin}/api/tournament/sync-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        matchId: match.id, 
        action: 'UNASSIGN', 
        unassignType: assignType, 
        removedStaffId: targetStaffId,
        reason,
      }),
    });
  } catch (err) {
    console.error('Gagal sync match pasca unassign:', err);
  }

  const reasonLabel = reason === 'COMPLETED' ? 'Match Selesai' : 'Ganti Staff';

  return {
    type: 4,
    data: {
      content: `🗑️ **Unassign Berhasil!** Penugasan **${targetStaffName}** sebagai **${roleTitle}** pada match **${match.id}** selesai dicabut (${reasonLabel}). Data di Match Report tetap tersimpan, role/perms Discord telah dibersihkan!`,
      flags: 64,
    },
  };
}
