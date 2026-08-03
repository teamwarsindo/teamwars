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
    const { matchId } = await req.json();

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m) => m.id === matchId);

    if (!match) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
    }

    // Ambil Role ID Tim A & Tim B dari Redis KV
    const [teamA, teamB] = await Promise.all([
      kv.hgetall(`teams:${getTeamSlug(match.teamAName)}`),
      kv.hgetall(`teams:${getTeamSlug(match.teamBName)}`),
    ]);

    const roleAId = (teamA as any)?.discordRoleId;
    const roleBId = (teamB as any)?.discordRoleId;

    // Panggil helper pembuatan channel match dengan User ID Wasit & Streamer
    const channelId = await createMatchDiscordChannel({
      matchId: match.id,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      roleAId,
      roleBId,
      refereeDiscordId: match.refereeDiscordId,
      streamerDiscordId: match.caster, // Caster/Streamer ID
    });

    if (!channelId) {
      return NextResponse.json({ error: 'Gagal membuat channel Discord' }, { status: 500 });
    }

    return NextResponse.json({ success: true, channelId });
  } catch (error) {
    console.error('Error generate channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
