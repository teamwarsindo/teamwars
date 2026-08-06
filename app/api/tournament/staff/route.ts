import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

export interface StaffItem {
  discordId: string;
  discordName: string;
}

// Helper untuk mengambil SELURUH member server Discord (dengan paginasi lengkap)
async function fetchAllGuildMembers(): Promise<any[]> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (!guildId) return [];

  let allMembers: any[] = [];
  let lastId: string | null = null;
  let hasMore = true;

  // Loop hingga seluruh member server terkumpul
  while (hasMore) {
    const endpointStr: string = `/guilds/${guildId}/members?limit=1000${lastId ? `&after=${lastId}` : ''}`;
    const members: any = await discordAPI(endpointStr, 'GET').catch(() => []);

    if (!Array.isArray(members) || members.length === 0) {
      hasMore = false;
    } else {
      allMembers = allMembers.concat(members);
      lastId = members[members.length - 1]?.user?.id || null;
      
      // Jika jumlah batch kurang dari 1000, berarti sudah mencapai akhir daftar member
      if (members.length < 1000 || !lastId) {
        hasMore = false;
      }
    }
  }

  return allMembers;
}

// Helper filter murni berdasarkan ketersediaan Role ID
function filterMembersByRole(members: any[], roleId: string): StaffItem[] {
  if (!roleId) return [];

  return members
    .filter((m) => Array.isArray(m.roles) && m.roles.includes(roleId))
    .map((m) => ({
      discordId: m.user.id,
      discordName: m.nick || m.user.global_name || m.user.username,
    }));
}

// GET: Ambil daftar staf dari KV untuk Dropdown Dashboard
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

// POST: Refresh murni menarik seluruh pemegang Role Referee & Streamer dari Discord
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'REFRESH_STAFF_ASSIGNMENTS') {
      // 1. Tarik seluruh member server tanpa terkecuali
      const allMembers = await fetchAllGuildMembers();

      // 2. Filter murni berdasarkan Role ID Referee & Streamer
      const fetchedReferees = filterMembersByRole(allMembers, DISCORD_CONFIG.ROLE_REFEREE);
      const fetchedStreamers = filterMembersByRole(allMembers, DISCORD_CONFIG.ROLE_STREAMER);

      // 3. Simpan daftar lengkap ke Redis KV
      await kv.set('staff:referees', fetchedReferees);
      await kv.set('staff:streamers', fetchedStreamers);

      return NextResponse.json({
        success: true,
        message: `Daftar staf berhasil diperbarui! Ditemukan ${fetchedReferees.length} Referee & ${fetchedStreamers.length} Streamer dari total ${allMembers.length} member.`,
        referees: fetchedReferees,
        streamers: fetchedStreamers,
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
