import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { deleteMatchDiscordChannel } from '@/lib/discord/channels';

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

    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamAName)}`),
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamBName)}`),
    ]);

    const roleAId = teamA?.discordRoleId;
    const roleBId = teamB?.discordRoleId;

    // 1. EXECUTE HAPUS CHANNEL DISCORD & REVOKE ROLE WASIT
    // Catch senyap jika channel atau role di Discord sudah tidak ada
    await deleteMatchDiscordChannel({
      matchId: match.id,
      savedChannelId: (match as any).discordChannelId,
      refereeDiscordId: match.refereeDiscordId,
      roleAId,
      roleBId,
    });

    // 2. HERSIHKAN RECORD DISCORD DI KV REDIS (Pasti Dieksekusi)
    (match as any).discordChannelId = null;
    (match as any).openingMsgId = null;

    schedules[matchIndex] = match;
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Pembersihan berhasil! Record Discord pada match ${match.id} di KV Redis dan perizinan terkait telah dibersihkan.`,
    });
  } catch (error) {
    console.error('Error Delete Match Channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}