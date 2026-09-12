import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { isDiscordAuthorized } from './assign/helpers';
import { executeUnassignStaff } from './assign/unassign-runner';

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

    if (!matchId || !assignType) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Option `match` dan `type` wajib diisi!', flags: 64 },
      });
    }

    const token = body.token;
    const appId = body.application_id || process.env.DISCORD_CLIENT_ID;
    const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

    waitUntil(
      (async () => {
        try {
          const { match, targetStaffName } = await executeUnassignStaff({
            matchId,
            assignType,
          });

          // Bersihkan metadata streamer/referee di match_reports
          const reportData = await kv.hget<any>('twi:match_reports', matchId);
          if (reportData && reportData.metadata) {
            if (assignType === 'STREAMER') {
              reportData.metadata.streamer = '';
              reportData.metadata.streamUrl = '';
              reportData.metadata.streamPlatform = 'YouTube';

              const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
              const targetIdx = schedules.findIndex((m) => m.id === matchId);
              if (targetIdx !== -1) {
                schedules[targetIdx].streamLink = undefined;
                (schedules[targetIdx] as any).streamUrl = undefined;
                await kv.set('twi:schedules', schedules);
              }
            } else {
              reportData.metadata.referee = '';
            }
            await kv.hset('twi:match_reports', { [matchId]: reportData });
          }

          const finalContent = `✅ **Unassign Berhasil!** Penugasan **${targetStaffName}** sebagai **${roleTitle}** pada match **${match.id}** telah dicabut.\nRole tim & izin akses room Discord telah dibersihkan!`;

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
