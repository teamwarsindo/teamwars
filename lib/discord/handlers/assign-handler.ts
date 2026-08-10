import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { executeAssignStaff } from '@/lib/discord/services/staff-assignment';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return (
    isAdmin ||
    (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
    (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
  );
}

export async function handleAssignCommand(interaction: any) {
  if (!isAuth(interaction)) {
    return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };
  }

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value as 'REFEREE' | 'STREAMER';
  const targetId = opts.find((o: any) => o.name === 'user')?.value;

  if (!matchId || !assignType || !targetId) {
    return { type: 4, data: { content: '❌ Option `match`, `type`, dan `user` wajib diisi!', flags: 64 } };
  }

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) return { type: 4, data: { content: '❌ Match tidak ditemukan!', flags: 64 } };

  // Cek Busy Lock
  const busyMatch = schedules.find(
    (m) =>
      m.id !== matchId &&
      (assignType === 'REFEREE' ? m.refereeDiscordId === targetId : m.streamerDiscordId === targetId)
  );

  if (busyMatch) {
    return {
      type: 4,
      data: {
        content: `⛔ Staf ini sedang aktif di match **${busyMatch.id}** (${busyMatch.teamAName} vs ${busyMatch.teamBName}). Gunakan \`/unassign\` terlebih dahulu!`,
        flags: 64,
      },
    };
  }

  try {
    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';
    const { match, staffName } = await executeAssignStaff({
      matchId,
      assignType,
      targetStaffId: targetId,
    });

    return {
      type: 4,
      data: {
        content: `✅ **${staffName}** berhasil ditugaskan sebagai **${roleTitle}** untuk match **${match.id}**! Roles/Permissions dan Log channel telah diperbarui.`,
        flags: 64,
      },
    };
  } catch (error: any) {
    console.error('Error executing assign:', error);
    return {
      type: 4,
      data: { content: `❌ Gagal memproses assign: ${error.message || error}`, flags: 64 },
    };
  }
}
