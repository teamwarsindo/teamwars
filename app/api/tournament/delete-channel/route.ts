import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { deleteMatchDiscordChannel } from '@/lib/discord/channels';

export async function POST(req: Request) {
  try {
    const { matchId } = await req.json();

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<any[]>('twi:schedules')) || [];
    const match = schedules.find((m) => m.id === matchId);

    if (!match) {
      return NextResponse.json({ error: 'Data match tidak ditemukan di Redis' }, { status: 404 });
    }

    const deleted = await deleteMatchDiscordChannel(match.id, match.teamAName, match.teamBName);

    if (deleted) {
      return NextResponse.json({ success: true, message: `Channel Discord untuk ${match.id} berhasil dihapus!` });
    } else {
      return NextResponse.json({ error: 'Channel Discord tidak ditemukan atau sudah dihapus' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error delete channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}