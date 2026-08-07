import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';

interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string | null;
  historyMatch?: Array<{
    matchId: string;
    matchName: string;
    completedAt: string;
    role: 'REFEREE' | 'STREAMER';
  }>;
}

// Helper update status active lock & history staf
async function updateStaffLockAndHistory(
  kvKey: 'staff:referees' | 'staff:streamers',
  staffDiscordId: string,
  newActiveMatchId: string | null,
  completedMatch?: { matchId: string; matchName: string; role: 'REFEREE' | 'STREAMER' }
) {
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const index = staffList.findIndex((s) => s.discordId === staffDiscordId);

  if (index !== -1) {
    const staff = { ...staffList[index] };
    staff.assignMatch = newActiveMatchId;

    if (completedMatch) {
      const history = staff.historyMatch || [];
      history.push({
        ...completedMatch,
        completedAt: new Date().toISOString(),
      });
      staff.historyMatch = history;
    }

    staffList[index] = staff;
    await kv.set(kvKey, staffList);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, matchId, type, userId } = body;

    if (!matchId || !action) {
      return NextResponse.json({ error: 'matchId dan action wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
    }

    const match = { ...schedules[matchIndex] };
    const matchName = `${match.teamAName} vs ${match.teamBName}`;

    // 🟢 1. ACTION: ASSIGN (Penugasan Awal)
    if (action === 'assign') {
      if (!type || !userId) {
        return NextResponse.json({ error: 'type dan userId wajib diisi untuk assign' }, { status: 400 });
      }

      if (type === 'REFEREE') {
        match.refereeDiscordId = userId;
        await updateStaffLockAndHistory('staff:referees', userId, match.id);
      } else if (type === 'STREAMER') {
        match.streamerDiscordId = userId;
        await updateStaffLockAndHistory('staff:streamers', userId, match.id);
      }

      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);

      return NextResponse.json({
        success: true,
        message: `Berhasil assign ${type} untuk Match ${match.id}`,
        match,
      });
    }

    // 🔄 2. ACTION: REASSIGN (Ganti Staf)
    if (action === 'reassign') {
      if (!type || !userId) {
        return NextResponse.json({ error: 'type dan userId (baru) wajib diisi untuk reassign' }, { status: 400 });
      }

      let oldUserId: string | undefined;

      if (type === 'REFEREE') {
        oldUserId = match.refereeDiscordId;
        if (oldUserId) {
          await updateStaffLockAndHistory('staff:referees', oldUserId, null);
        }
        match.refereeDiscordId = userId;
        await updateStaffLockAndHistory('staff:referees', userId, match.id);
      } else if (type === 'STREAMER') {
        oldUserId = match.streamerDiscordId;
        if (oldUserId) {
          await updateStaffLockAndHistory('staff:streamers', oldUserId, null);
        }
        match.streamerDiscordId = userId;
        await updateStaffLockAndHistory('staff:streamers', userId, match.id);
      }

      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);

      return NextResponse.json({
        success: true,
        message: `Berhasil reassign ${type} dari <@${oldUserId}> ke <@${userId}> untuk Match ${match.id}`,
        oldUserId,
        newUserId: userId,
        match,
      });
    }

    // ✅ 3. ACTION: COMPLETE (Match Selesai)
    if (action === 'complete') {
      const completedRoles: string[] = [];

      if ((type === 'REFEREE' || type === 'BOTH') && match.refereeDiscordId) {
        await updateStaffLockAndHistory('staff:referees', match.refereeDiscordId, null, {
          matchId: match.id,
          matchName,
          role: 'REFEREE',
        });
        completedRoles.push('REFEREE');
      }

      if ((type === 'STREAMER' || type === 'BOTH') && (match.streamerDiscordId || (match as any).casterDiscordId)) {
        const strId = match.streamerDiscordId || (match as any).casterDiscordId;
        await updateStaffLockAndHistory('staff:streamers', strId, null, {
          matchId: match.id,
          matchName,
          role: 'STREAMER',
        });
        completedRoles.push('STREAMER');
      }

      schedules[matchIndex] = match;
      await kv.set('twi:schedules', schedules);

      return NextResponse.json({
        success: true,
        message: `Penugasan [${completedRoles.join(', ')}] untuk Match ${match.id} selesai!`,
        match,
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error) {
    console.error('Error Staff Route:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}