import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const teams = await kv.smembers("global:teams");
    
    let discordList = "=== LIST DISCORD TAG UNTUK INVITE ===\n\n";
    let ignList = "=== LIST IGN UNTUK DISPLAY NAME ===\n\n";

    for (const slug of teams) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData || !teamData.players) continue;

      const players = typeof teamData.players === "string" ? JSON.parse(teamData.players) : teamData.players;
      
      discordList += `[${teamData.namaTim}]\n`;
      ignList += `[${teamData.namaTim}]\n`;

      let teamDiscords = [];
      for (const p of players) {
        // Bersihkan kalau ada peserta yang iseng nulis pakai @ di form
        const cleanDiscord = p.discord ? p.discord.replace('@', '').trim() : '';
        const cleanIgn = p.ign ? p.ign.trim() : '';

        if (cleanDiscord) teamDiscords.push(`@${cleanDiscord}`);
        if (cleanIgn) ignList += `${cleanIgn} (${p.role})\n`;
      }

      // Discord digabung pakai spasi biar bisa dicopas sekaligus ngetag banyak orang
      discordList += teamDiscords.join(' ') + "\n\n";
      ignList += "\n";
    }

    // Return sebagai TEXT biasa (bukan JSON) supaya gampang di-copy
    return new NextResponse(discordList + ignList, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error: any) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
