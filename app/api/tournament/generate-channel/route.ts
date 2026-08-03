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
    const url = new URL(req.url);
    const isTestingQuery = url.searchParams.get('testing') === 'true';

    const body = await req.json().catch(() => ({}));
    const { matchId, matchIds, weekName, testing: isTestingBody } = body;

    // 🧪 MODE TESTING ACTIVE JIKA ?testing=true DI URL ATAU BODY
    const isTesting = isTestingQuery || !!isTestingBody;

    // JIKA MODE TESTING & TIDAK ADA MATCH ID, GUNAKAN DUMMY TEST MATCH
    if (isTesting && !matchId && (!matchIds || matchIds.length === 0)) {
      const testChannelId = await createMatchDiscordChannel({
        matchId: 'match-test',
        teamAName: 'Testing Team Alpha',
        teamBName: 'Testing Team Beta',
        weekName: 'Week Test',
        matchDateIso: new Date().toISOString(),
        refereeName: 'Admin Tester',
        streamerName: 'Caster Tester',
        isTesting: true,
      });

      return NextResponse.json({
        success: true,
        mode: 'TESTING',
        message: 'Berhasil membuat channel ⚔️-match-test dengan data dummy!',
        channelId: testChannelId,
      });
    }

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

      const [teamA, teamB] = await Promise.all([
        kv.hgetall(`teams:${getTeamSlug(match.teamAName)}`),
        kv.hgetall(`teams:${getTeamSlug(match.teamBName)}`),
      ]);

      const roleAId = (teamA as any)?.discordRoleId;
      const roleBId = (teamB as any)?.discordRoleId;

      const channelId = await createMatchDiscordChannel({
        matchId: match.id,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        weekName: weekName || 'Week 1',
        matchDateIso: match.matchDate,
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.caster,
        streamLink: match.streamLink,
        roleAId,
        roleBId,
        isSync,
        isTesting, // 👈 Teruskan parameter testing
      });

      results.push({ matchId: mId, success: !!channelId, channelId });

      if (targetMatchIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (isScheduleUpdated) {
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({ success: true, mode: isTesting ? 'TESTING' : 'PRODUCTION', totalProcessed: results.length, results });
  } catch (error) {
    console.error('Error generate channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
