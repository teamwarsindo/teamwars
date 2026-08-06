import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

export async function GET() {
  try {
    const referees = (await kv.get<StaffItem[]>('staff:referees')) || [];
    const streamers = (await kv.get<StaffItem[]>('staff:streamers')) || [];

    return NextResponse.json({
      success: true,
      referees,
      streamers,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'REFRESH_STAFF_ASSIGNMENTS') {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      const referees = (await kv.get<StaffItem[]>('staff:referees')) || [];
      const streamers = (await kv.get<StaffItem[]>('staff:streamers')) || [];

      // Reset list assignMatch
      const updatedReferees = referees.map((r) => ({ ...r, assignMatch: [] as string[] }));
      const updatedStreamers = streamers.map((s) => ({ ...s, assignMatch: [] as string[] }));

      schedules.forEach((m) => {
        if (m.refereeDiscordId) {
          const ref = updatedReferees.find((r) => r.discordId === m.refereeDiscordId);
          if (ref) ref.assignMatch?.push(m.id);
        }
        const streamerId = m.streamerDiscordId || m.casterDiscordId;
        if (streamerId) {
          const str = updatedStreamers.find((s) => s.discordId === streamerId);
          if (str) str.assignMatch?.push(m.id);
        }
      });

      await kv.set('staff:referees', updatedReferees);
      await kv.set('staff:streamers', updatedStreamers);

      return NextResponse.json({
        success: true,
        message: 'Master data staf dan daftar penugasan match berhasil di-refresh!',
        referees: updatedReferees,
        streamers: updatedStreamers,
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
