import { DISCORD_CONFIG } from '@/lib/discord/config';
import { executeUnassignStaff } from '@/lib/discord/services/staff-assignment';

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

export async function handleUnassignCommand(interaction: any) {
  if (!isAuth(interaction)) {
    return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };
  }

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value as 'REFEREE' | 'STREAMER';
  const scoreAOpt = opts.find((o: any) => o.name === 'score_a')?.value;
  const scoreBOpt = opts.find((o: any) => o.name === 'score_b')?.value;
  const streamLinkOpt = opts.find((o: any) => o.name === 'stream_link' || o.name === 'link')?.value;

  if (!matchId || !assignType) {
    return { type: 4, data: { content: '❌ Option `match` dan `type` wajib diisi!', flags: 64 } };
  }

  // 1. Validasi Wajib untuk Referee
  if (assignType === 'REFEREE' && (scoreAOpt === undefined || scoreBOpt === undefined)) {
    return {
      type: 4,
      data: { content: '❌ Unassign Referee WAJIB mengisi `score_a` dan `score_b`!', flags: 64 },
    };
  }

  // 2. Validasi Wajib untuk Streamer
  if (assignType === 'STREAMER' && (!streamLinkOpt || !streamLinkOpt.trim().startsWith('http'))) {
    return {
      type: 4,
      data: {
        content: '❌ Unassign Streamer WAJIB menyertakan `stream_link` yang valid (contoh: https://youtube.com/...)!',
        flags: 64,
      },
    };
  }

  const scoreA = scoreAOpt !== undefined ? parseInt(scoreAOpt, 10) : 0;
  const scoreB = scoreBOpt !== undefined ? parseInt(scoreBOpt, 10) : 0;

  try {
    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';
    const { match, targetStaffName } = await executeUnassignStaff({
      matchId,
      assignType,
      scoreA,
      scoreB,
      streamLink: streamLinkOpt,
    });

    const extraMsg =
      assignType === 'REFEREE'
        ? `\n🏆 Skor Akhir: **${scoreA} - ${scoreB}** (Terkirim ke #CH_SCORE)`
        : `\n🎥 Link Streaming: ${streamLinkOpt}`;

    return {
      type: 4,
      data: {
        content: `✅ **Unassign Berhasil!** Tugas **${targetStaffName}** sebagai **${roleTitle}** pada match **${match.id}** telah Selesai.${extraMsg}\nRole/Akses Discord telah dibersihkan!`,
        flags: 64,
      },
    };
  } catch (error: any) {
    console.error('Error executing unassign:', error);
    return {
      type: 4,
      data: { content: `❌ Gagal memproses unassign: ${error.message || error}`, flags: 64 },
    };
  }
}
