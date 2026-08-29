import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { isDiscordAuthorized } from '@/lib/discord/services/staff-assignment';
import { executeSwapAssignStaff } from '@/lib/discord/services/staff-swap-service';
import { discordAPI } from '@/lib/discord/utils';

export async function handleSwapAssignCommand(body: any) {
  try {
    if (!isDiscordAuthorized(body)) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 },
      });
    }

    const opts = body.data?.options || [];
    const matchAId = opts.find((o: any) => o.name === 'match_a')?.value;
    const matchBId = opts.find((o: any) => o.name === 'match_b')?.value;
    const assignType = opts.find((o: any) => o.name === 'type')?.value as 'REFEREE' | 'STREAMER';

    if (!matchAId || !matchBId || !assignType) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Parameter `type`, `match_a`, dan `match_b` wajib diisi!', flags: 64 },
      });
    }

    const token = body.token;
    const appId = body.application_id || process.env.DISCORD_CLIENT_ID;
    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

    waitUntil(
      (async () => {
        try {
          const { matchA, matchB, staffAName, staffBName } = await executeSwapAssignStaff({
            matchAId,
            matchBId,
            assignType,
          });

          const finalContent = `🔄 **Swap ${roleTitle} Berhasil!**\n• **${staffAName}** ➔ Ditugaskan ke match **${matchB.id}**\n• **${staffBName}** ➔ Ditugaskan ke match **${matchA.id}**\n\nRoles, permissions, opening embeds (re-posted), dan logs telah diperbarui.`;

          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: finalContent,
            });
          }
        } catch (err: any) {
          console.error('Error background swap-assign execution:', err);
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: `❌ ${err.message || 'Gagal memproses swap assign staf'}`,
            });
          }
        }
      })()
    );

    return NextResponse.json({
      type: 5,
      data: { flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling /swap-assign command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses swap assign staf'}`, flags: 64 },
    });
  }
}
