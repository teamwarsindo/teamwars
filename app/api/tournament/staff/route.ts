import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

export interface StaffItem {
  discordId: string;
  discordName: string;
}

// Helper untuk fetch member Discord berdasarkan Role ID
async function fetchGuildMembersByRole(roleId: string): Promise<StaffItem[]> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (!guildId || !roleId) return [];

  // Fetch list member dari server Discord (limit 1000)
  const members = await discordAPI(`/guilds/${guildId}/members?limit=1000`, 'GET').catch(() => []);
  if (!Array.isArray(members)) return [];

  // Filter member yang memiliki role target
  return members
    .filter((m: any) => m.roles && m.roles.includes(roleId))
    .map((m: any) => ({
      discordId: m.user.id,
      discordName: m.nick || m.user.global_name || m.user.username,
    }));
}

// GET: Ambil daftar staf dari KV untuk kebutuhan Dropdown Dashboard
export async function GET() {
  try {
    const referees = (await kv.get<StaffItem[]>('staff:referees')) || [];
    const streamers = (await kv.get<StaffItem[]>('staff:streamers')) || [];

    return NextResponse.json({
      success: true,
      referees,
      streamers,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Murni Refresh Data Staf dari Discord ke KV
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'REFRESH_STAFF_ASSIGNMENTS') {
      // 1. Fetch user dari Discord yang punya role Referee & Streamer
      const [fetchedReferees, fetchedStreamers] = await Promise.all([
        fetchGuildMembersByRole(DISCORD_CONFIG.ROLE_REFEREE),
        fetchGuildMembersByRole(DISCORD_CONFIG.ROLE_STREAMER),
      ]);

      // 2. Timpa / Update daftar master staf di KV Redis
      await kv.set('staff:referees', fetchedReferees);
      await kv.set('staff:streamers', fetchedStreamers);

      return NextResponse.json({
        success: true,
        message: `Daftar staf berhasil diperbarui dari Discord! (${fetchedReferees.length} Referee, ${fetchedStreamers.length} Streamer)`,
        referees: fetchedReferees,
        streamers: fetchedStreamers,
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
      }
