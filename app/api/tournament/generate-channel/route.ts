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

export async function POST(req: Request) {
  try {
    const { matchId, matchIds } = await req.json();

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const targetMatchIds: string[] = matchIds || (matchId ? [matchId] : []);

    if (targetMatchIds.length === 0) {
      return NextResponse.json({ error: 'Tidak ada match yang dipilih' }, { status: 400 });
    }

    const results = [];

    for (const mId of targetMatchIds) {
      const match = schedules.find((m) => m.id === mId);
      if (!match) continue;

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
        matchDateIso: match.matchDate,
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.caster,
        streamLink: match.streamLink,
        roleAId,
        roleBId,
      });

      results.push({ matchId: mId, success: !!channelId, channelId });

      if (targetMatchIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({ success: true, totalProcessed: results.length, results });
  } catch (error) {
    console.error('Error generate channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
