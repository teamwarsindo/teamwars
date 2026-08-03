import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const TRACKED_CHANNELS = [
  { id: '1532355472764440576', name: 'Team STAR' },
  { id: '1532355753535471827', name: 'Team CHAMP' },
];

export async function GET() {
  try {
    const teamsData = [];

    for (const channel of TRACKED_CHANNELS) {
      const data = await kv.get<any>(`deck_rekap:${channel.id}`);
      if (data) {
        teamsData.push(data);
      } else {
        teamsData.push({
          channelId: channel.id,
          teamName: channel.name,
          totalDecks: 0,
          totalPlayers: 0,
          isComplete: false,
          players: [],
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, data: teamsData });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
  
