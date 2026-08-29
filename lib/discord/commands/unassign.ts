import { NextResponse } from 'next/server';
import { isDiscordAuthorized, executeUnassignStaff } from '@/lib/discord/services/staff-assignment';

export async function handleUnassignCommand(body: any) {
  try {
    if (!isDiscordAuthorized(body)) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 },
      });
    }

    const opts = body.data?.options || [];
    const matchId = opts.find((o: any) => o.name === 'match')?.value;
    const assignType = opts.find((o: any) => o.name === 'type')?.value as 'REFEREE' | 'STREAMER';
    const scoreAOpt = opts.find((o: any) => o.name === 'score_a')?.value;
    const scoreBOpt = opts.find((o: any) => o.name === 'score_b')?.value;

    if (!matchId || !assignType) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Option `match` dan `type` wajib diisi!', flags: 64 },
      });
    }

    if (assignType === 'REFEREE' && (scoreAOpt === undefined || scoreBOpt === undefined)) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Unassign Referee WAJIB mengisi `score_a` dan `score_b`!', flags: 64 },
      });
    }

    const scoreA = scoreAOpt !== undefined ? parseInt(scoreAOpt, 10) : 0;
    const scoreB = scoreBOpt !== undefined ? parseInt(scoreBOpt, 10) : 0;

    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';
    const { match, targetStaffName } = await executeUnassignStaff({
      matchId,
      assignType,
      scoreA,
      scoreB,
    });

    const extraMsg =
      assignType === 'REFEREE'
        ? `\n🏆 Skor Akhir: **${scoreA} - ${scoreB}** (Terkirim ke channel skor)`
        : `\nℹ️ Slot streamer match **${match.id}** kini telah dilepas / batal siaran.`;

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ **Unassign Berhasil!** Tugas **${targetStaffName}** sebagai **${roleTitle}** pada match **${match.id}** telah Selesai.${extraMsg}\nRole/Akses Discord telah dibersihkan!`,
        flags: 64,
      },
    });
  } catch (error: any) {
    console.error('Error handling /unassign command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses unassign'}`, flags: 64 },
    });
  }
}