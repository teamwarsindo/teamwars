import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'default-room';
  const username = searchParams.get('username') || `user_${Math.floor(Math.random() * 1000)}`;
  const isHost = searchParams.get('host') === 'true'; // Cek apakah role-nya Host

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Buat Token dengan izin khusus
  const at = new AccessToken(apiKey, apiSecret, {
    identity: username,
    name: username,
  });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: isHost,      // HANYA Host yang boleh Share Screen / Mic
    canPublishData: isHost,
    canSubscribe: true,      // Penonton & Host sama-sama bisa nonton
  });

  return NextResponse.json({ token: await at.toJwt(), wsUrl });
}
