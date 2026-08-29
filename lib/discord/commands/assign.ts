import { NextResponse } from 'next/server';
import { isDiscordAuthorized, executeAssignStaff } from '@/lib/discord/services/staff-assignment';

export async function handleAssignCommand(body: any) {
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
    const targetId = opts.find((o: any) => o.name === 'user')?.value;

    if (!matchId || !assignType || !targetId) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Option `match`, `type`, dan `user` wajib diisi!', flags: 64 },
      });
    }

    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';
    const { match, staffName, replacedStaffName } = await executeAssignStaff({
      matchId,
      assignType,
      targetStaffId: targetId,
    });

    const replaceMsg = replacedStaffName
      ? `\n🔄 *(Menggantikan ${replacedStaffName} yang berhalangan)*`
      : '';

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ **${staffName}** berhasil ditugaskan sebagai **${roleTitle}** untuk match **${match.id}**!${replaceMsg}\nRoles/Permissions dan Log channel telah diperbarui.`,
        flags: 64,
      },
    });
  } catch (error: any) {
    console.error('Error handling /assign command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses assign'}`, flags: 64 },
    });
  }
}