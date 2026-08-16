import { DISCORD_CONFIG } from '@/lib/discord/config';
import { executeCancelAssignStaff } from '@/lib/discord/services/staff-assignment';

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

export async function handleCancelAssignCommand(interaction: any) {
  if (!isAuth(interaction)) {
    return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };
  }

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value as 'REFEREE' | 'STREAMER';
  const reason = opts.find((o: any) => o.name === 'reason')?.value;

  if (!matchId || !assignType || !reason) {
    return {
      type: 4,
      data: { content: '❌ Field `match`, `type`, dan `reason` (alasan) wajib diisi!', flags: 64 },
    };
  }

  try {
    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';
    const { match, targetStaffName } = await executeCancelAssignStaff({
      matchId,
      assignType,
      reason,
    });

    return {
      type: 4,
      data: {
        content: `❌ **Pembatalan Penugasan Berhasil!**\nTugas **${targetStaffName}** sebagai **${roleTitle}** pada match **${match.id}** telah dibatalkan.\nRole/Akses Discord telah dicabut dan log pembatalan telah dikirim ke #CH_ASSIGN.`,
        flags: 64,
      },
    };
  } catch (error: any) {
    console.error('Error executing cancel-assign:', error);
    return {
      type: 4,
      data: { content: `❌ Gagal memproses pembatalan: ${error.message || error}`, flags: 64 },
    };
  }
    }
