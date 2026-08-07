import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { archiveMatchDiscordChannel } from '@/lib/discord/channels';

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
    const body = await req.json().catch(() => ({}));
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const matchIndex = schedules.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan di Redis' }, { status: 404 });
    }

    const match = schedules[matchIndex];

    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);

    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
      kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
    ]);

    const roleAId = teamA?.discordRoleId || teamA?.roleId;
    const roleBId = teamB?.discordRoleId || teamB?.roleId;

    await archiveMatchDiscordChannel({
      matchId: match.id,
      savedChannelId: (match as any).discordChannelId,
      refereeDiscordId: match.refereeDiscordId,
      streamerDiscordId: match.streamerDiscordId || (match as any).casterDiscordId,
      roleAId,
      roleBId,
    });

    return NextResponse.json({
      success: true,
      message: `Match ${match.id} berhasil diarsip! Channel kini berstatus Read-Only.`,
    });
  } catch (error) {
    console.error('Error Archive Match Channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}