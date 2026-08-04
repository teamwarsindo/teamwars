import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { createMatchDiscordChannel } from '@/lib/discord/channels';

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateRandomToken(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, matchIds, weekName } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const targetMatchIds: string[] = matchIds || (matchId ? [matchId] : []);

    if (targetMatchIds.length === 0) {
      return NextResponse.json({ error: 'Tidak ada match yang dipilih' }, { status: 400 });
    }

    const results = [];
    const isSync = !matchIds;
    let isScheduleUpdated = false;

    for (const mId of targetMatchIds) {
      const matchIndex = schedules.findIndex((m) => m.id === mId);
      if (matchIndex === -1) continue;

      const match = schedules[matchIndex];

      if (!match.refereeToken) {
        match.refereeToken = generateRandomToken(16);
        schedules[matchIndex] = match;
        isScheduleUpdated = true;
      }

      // Ambil Hash Data Tim A & Tim B dari Upstash Redis
      const [teamA, teamB] = await Promise.all([
        kv.hgetall<any>(`teams:${getTeamSlug(match.teamAName)}`),
        kv.hgetall<any>(`teams:${getTeamSlug(match.teamBName)}`),
      ]);

      const roleAId = teamA?.discordRoleId;
      const roleBId = teamB?.discordRoleId;
      const kodeTimA = teamA?.kodeTim; // 👈 Baca field kodeTim
      const kodeTimB = teamB?.kodeTim; // 👈 Baca field kodeTim

      const channelId = await createMatchDiscordChannel({
        matchId: match.id,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        kodeTimA,
        kodeTimB,
        weekName: weekName || `Week ${(match as any).calculatedWeekNumber || 1}`,
        matchDateIso: match.matchDate,
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.caster,
        streamLink: match.streamLink,
        roleAId,
        roleBId,
        isSync,
      });

      results.push({ matchId: mId, success: !!channelId, channelId });

      if (targetMatchIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (isScheduleUpdated) {
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error Sync/Generate channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}