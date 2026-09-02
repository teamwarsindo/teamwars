import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { isDiscordAuthorized, executeUnassignStaff } from '@/lib/discord/services/staff-assignment';
import { discordAPI } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/app/tournament/_library';

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

    // Menjaga instance Vercel tetap hidup sampai unassign selesai dan pesan ter-edit
    waitUntil(
      (async () => {
        try {
          const { match, targetStaffName } = await executeUnassignStaff({
            matchId,
            assignType,
            scoreA,
            scoreB,
          });

          // 🔴 KHUSUS STREAMER: Hapus streamer & link streaming di twi:match_reports dan twi:schedules
          // JIKA REFEREE: Data tetap dibiarkan aman sebagai arsip wasit bertugas
          if (assignType === 'STREAMER') {
            // 1. Bersihkan di Hash twi:match_reports
            const reportData = await kv.hget<any>('twi:match_reports', matchId);
            if (reportData && reportData.metadata) {
              reportData.metadata.streamer = '';
              reportData.metadata.streamUrl = '';
              reportData.metadata.streamPlatform = 'YouTube';
              await kv.hset('twi:match_reports', { [matchId]: reportData });
            }

            // 2. Bersihkan streamLink di twi:schedules
            const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
            const targetIdx = schedules.findIndex((m) => m.id === matchId);
            if (targetIdx !== -1) {
              schedules[targetIdx].streamLink = undefined;
              (schedules[targetIdx] as any).streamUrl = undefined;
              await kv.set('twi:schedules', schedules);
            }
          }

          const extraMsg =
            assignType === 'REFEREE'
              ? `\n🏆 Skor Akhir: **${scoreA} - ${scoreB}** (Terkirim ke channel skor)`
              : `\nℹ️ Slot streamer match **${match.id}** beserta tautan siaran telah dilepas / dibersihkan.`;

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
      })()
    );

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
