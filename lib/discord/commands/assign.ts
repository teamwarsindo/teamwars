import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { isDiscordAuthorized, executeAssignStaff } from '@/lib/discord/services/staff-assignment';
import { discordAPI } from '@/lib/discord/utils';

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

    const token = body.token;
    const appId = body.application_id || process.env.DISCORD_CLIENT_ID;

    // Menjaga instance Vercel tetap hidup sampai proses selesai dan pesan ter-edit
    waitUntil(
      (async () => {
        try {
          const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';
          const { match, staffName, replacedStaffName } = await executeAssignStaff({
            matchId,
            assignType,
            targetStaffId: targetId,
          });

          const replaceMsg = replacedStaffName
            ? `\n🔄 *(Menggantikan ${replacedStaffName} yang berhalangan)*`
            : '';

          const finalContent = `✅ **${staffName}** berhasil ditugaskan sebagai **${roleTitle}** untuk match **${match.id}**!${replaceMsg}\nRoles/Permissions dan Log channel telah diperbarui.`;

          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: finalContent,
            });
          }
        } catch (err: any) {
          console.error('Error background assign execution:', err);
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: `❌ ${err.message || 'Gagal memproses assign'}`,
            });
          }
        }
      })()
    );

    // Respon instan ke Discord (< 200ms) agar tidak timeout
    return NextResponse.json({
      type: 5,
      data: { flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling /assign command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses assign'}`, flags: 64 },
    });
  }
}
