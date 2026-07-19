import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    const newVerifiedUsers: Record<string, string> = {};
    let totalMoved = 0;

    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData || !teamData.players) continue;
      
      let players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      let isModified = false;

      // Bersihkan discordId dan pindahkan ke map baru
      const cleanedPlayers = players.map((p: any) => {
        if (p.discordId) {
          newVerifiedUsers[p.discord.toLowerCase()] = p.discordId;
          totalMoved++;
          isModified = true;
        }
        const { discordId, ...cleanPlayer } = p; // Hapus properti discordId
        return cleanPlayer;
      });

      // Timpa DB tim dengan array pemain yang sudah bersih
      if (isModified) {
        await kv.hset(`teams:${slug}`, { players: JSON.stringify(cleanedPlayers) });
      }
    }

    // Buat map global baru
    if (Object.keys(newVerifiedUsers).length > 0) {
      await kv.hset('global:verified_users', newVerifiedUsers);
    }
    
    // Hapus map global lama
    await kv.del('global:discord_map');

    return NextResponse.json({ 
      success: true, 
      message: `Migrasi selesai! ${totalMoved} ID dipindahkan ke global:verified_users.` 
    });
  } catch (error: any) {
    console.error("Migrasi Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
