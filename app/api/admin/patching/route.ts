import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/commands/assign/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const referees = (await kv.get<StaffItem[]>('staff:referees')) || [];
    const streamers = (await kv.get<StaffItem[]>('staff:streamers')) || [];

    if (!schedules.length) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada data jadwal ditemukan di twi:schedules.',
      }, { status: 404 });
    }

    // Filter seluruh match yang sudah selesai (isFinished: true)
    const finishedMatches = schedules.filter((m) => Boolean(m.isFinished));

    let updatedRefereesCount = 0;
    let updatedStreamersCount = 0;

    // 1. PATCHING REFEREES
    const patchedReferees = referees.map((ref) => {
      const currentHistory: string[] = Array.isArray((ref as any).historyMatch)
        ? [...(ref as any).historyMatch]
        : [];
      let currentAssign: string[] = Array.isArray(ref.assignMatch)
        ? [...ref.assignMatch]
        : [];

      let hasChange = !Array.isArray((ref as any).historyMatch);

      finishedMatches.forEach((m) => {
        const isMatched =
          (m.refereeDiscordId && m.refereeDiscordId === ref.discordId) ||
          (m.referee && m.referee.trim().toLowerCase() === ref.discordName.trim().toLowerCase());

        if (isMatched) {
          if (!currentHistory.includes(m.id)) {
            currentHistory.push(m.id);
            hasChange = true;
          }
          if (currentAssign.includes(m.id)) {
            currentAssign = currentAssign.filter((id) => id !== m.id);
            hasChange = true;
          }
        }
      });

      if (hasChange) {
        updatedRefereesCount++;
      }

      return {
        ...ref,
        assignMatch: currentAssign,
        historyMatch: currentHistory,
      };
    });

    // 2. PATCHING STREAMERS
    const patchedStreamers = streamers.map((str) => {
      const currentHistory: string[] = Array.isArray((str as any).historyMatch)
        ? [...(str as any).historyMatch]
        : [];
      let currentAssign: string[] = Array.isArray(str.assignMatch)
        ? [...str.assignMatch]
        : [];

      let hasChange = !Array.isArray((str as any).historyMatch);

      finishedMatches.forEach((m) => {
        const streamerId = m.streamerDiscordId || (m as any).caster;
        const isMatched =
          (streamerId && streamerId === str.discordId) ||
          (m.streamer && m.streamer.trim().toLowerCase() === str.discordName.trim().toLowerCase());

        if (isMatched) {
          if (!currentHistory.includes(m.id)) {
            currentHistory.push(m.id);
            hasChange = true;
          }
          if (currentAssign.includes(m.id)) {
            currentAssign = currentAssign.filter((id) => id !== m.id);
            hasChange = true;
          }
        }
      });

      if (hasChange) {
        updatedStreamersCount++;
      }

      return {
        ...str,
        assignMatch: currentAssign,
        historyMatch: currentHistory,
      };
    });

    // Simpan pembaruan ke KV jika ada data yang dipatch
    await kv.set('staff:referees', patchedReferees);
    await kv.set('staff:streamers', patchedStreamers);

    return NextResponse.json({
      success: true,
      message: 'Patching riwayat match selesai berhasil dijalankan.',
      totalFinishedMatches: finishedMatches.length,
      refereesUpdated: updatedRefereesCount,
      streamersUpdated: updatedStreamersCount,
      data: {
        referees: patchedReferees.map((r) => ({
          name: r.discordName,
          assignMatch: r.assignMatch,
          historyCount: (r as any).historyMatch?.length || 0,
          historyMatch: (r as any).historyMatch,
        })),
        streamers: patchedStreamers.map((s) => ({
          name: s.discordName,
          assignMatch: s.assignMatch,
          historyCount: (s as any).historyMatch?.length || 0,
          historyMatch: (s as any).historyMatch,
        })),
      },
    });
  } catch (error: any) {
    console.error('[PATCHING HISTORY ERROR]:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat patching riwayat match staf.',
    }, { status: 500 });
  }                        
}
