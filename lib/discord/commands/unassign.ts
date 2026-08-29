import { NextResponse } from 'next/server';
import { isDiscordAuthorized, executeUnassignStaff } from '@/lib/discord/services/staff-assignment';
import { discordAPI } from '@/lib/discord/utils';

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

    const token = body.token;
    const appId = body.application_id || process.env.DISCORD_CLIENT_ID;
    const scoreA = scoreAOpt !== undefined ? parseInt(scoreAOpt, 10) : 0;
    const scoreB = scoreBOpt !== undefined ? parseInt(scoreBOpt, 10) : 0;
    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

    // Eksekusi proses berat secara background agar respon awal tidak timeout
    (async () => {
      try {
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

        const finalContent = `✅ **Unassign Berhasil!** Tugas **${targetStaffName}** sebagai **${roleTitle}** pada match **${match.id}** telah Selesai.${extraMsg}\nRole/Akses Discord telah dibersihkan!`;

        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: finalContent,
          });
        }
      } catch (err: any) {
        console.error('Error background unassign execution:', err);
        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `❌ ${err.message || 'Gagal memproses unassign'}`,
          });
        }
      }
    })();

    // Kirim respons Defer (Type 5) instan ke Discord dalam < 500ms
    return NextResponse.json({
      type: 5,
      data: { flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling /unassign command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses unassign'}`, flags: 64 },
    });
  }
}