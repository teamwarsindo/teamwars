import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string | null;
  historyMatch?: Array<{
    matchId: string;
    matchName: string;
    completedAt: string;
    role: 'REFEREE' | 'STREAMER';
  }>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type } = body;

    const guildId = DISCORD_CONFIG.GUILD_ID;
    if (!guildId) {
      return NextResponse.json({ error: 'GUILD_ID tidak terkonfigurasi' }, { status: 400 });
    }

    const members = await discordAPI(`/guilds/${guildId}/members?limit=1000`, 'GET');
    if (!Array.isArray(members)) {
      return NextResponse.json({ error: 'Gagal mengambil daftar member dari Discord' }, { status: 500 });
    }

    const refRoleId = DISCORD_CONFIG.ROLE_REFEREE;
    const strRoleId = DISCORD_CONFIG.ROLE_STREAMER;

    let updatedReferees = 0;
    let updatedStreamers = 0;

    if (type === 'REFEREE' || type === 'BOTH' || !type) {
      const currentRefs = (await kv.get<StaffItem[]>('staff:referees')) || [];
      const newRefList: StaffItem[] = [];

      for (const m of members) {
        if (m.roles?.includes(refRoleId)) {
          const discordId = m.user.id;
          const discordName = m.nick || m.user.global_name || m.user.username;
          const existing = currentRefs.find((s) => s.discordId === discordId);

          newRefList.push({
            discordId,
            discordName,
            assignMatch: existing?.assignMatch || null,
            historyMatch: existing?.historyMatch || [],
          });
        }
      }
      await kv.set('staff:referees', newRefList);
      updatedReferees = newRefList.length;
    }

    if (type === 'STREAMER' || type === 'BOTH' || !type) {
      const currentStrs = (await kv.get<StaffItem[]>('staff:streamers')) || [];
      const newStrList: StaffItem[] = [];

      for (const m of members) {
        if (m.roles?.includes(strRoleId)) {
          const discordId = m.user.id;
          const discordName = m.nick || m.user.global_name || m.user.username;
          const existing = currentStrs.find((s) => s.discordId === discordId);

          newStrList.push({
            discordId,
            discordName,
            assignMatch: existing?.assignMatch || null,
            historyMatch: existing?.historyMatch || [],
          });
        }
      }
      await kv.set('staff:streamers', newStrList);
      updatedStreamers = newStrList.length;
    }

    return NextResponse.json({
      success: true,
      message: `Master list staf berhasil diperbarui! (${updatedReferees} Referee, ${updatedStreamers} Streamer)`,
    });
  } catch (error) {
    console.error('Error Sync Staff:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}