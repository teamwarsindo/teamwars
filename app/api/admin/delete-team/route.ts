import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    // 1. Ambil data tim & map verified user
    const [team, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) {
      return NextResponse.json({ error: 'Data tim tidak ditemukan di database.' }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    // 2. DISCORD CLEANUP (Dibungkus try-catch individu agar kalau 1 gagal, yang lain tetap jalan)
    
    // A. Reset Nickname semua pemain ke default (hapus IGN)
    for (const p of players) {
      const pDiscord = p.discord ? p.discord.toLowerCase().replace(/^@/, '').trim() : '';
      const discordId = verifiedMap[pDiscord];

      if (discordId) {
        try {
          // Ngirim nick: null akan me-reset display name ke aslinya
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}`, 'PATCH', { nick: null });
        } catch (err) {
          console.error(`Gagal reset nickname user ${p.discord}:`, err);
        }
      }
    }

    // B. Hapus Role Tim di Discord
    const roleId = team.discordRoleId || team.roleId;
    if (roleId) {
      try {
        await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/roles/${roleId}`, 'DELETE');
      } catch (err) {
        console.error(`Gagal hapus Role ID ${roleId}:`, err);
      }
    }

    // C. Hapus Channel Tim (Camp) di Discord
    const channelId = team.discordChannelId || team.channelId;
    if (channelId) {
      try {
        await discordAPI(`/channels/${channelId}`, 'DELETE');
      } catch (err) {
        console.error(`Gagal hapus Channel ID ${channelId}:`, err);
      }
    }

    // 3. DATABASE CLEANUP (Sapu Bersih)
    for (const p of players) {
      const cleanDiscord = p.discord?.toLowerCase().replace(/^@/, '').trim();
      const cleanIgn = p.ign?.toLowerCase().trim();

      if (cleanDiscord) {
        await kv.srem('registered_discords', cleanDiscord);
        await kv.del(`player:${cleanDiscord}`);
      }
      if (cleanIgn) {
        await kv.srem('registered_igns', cleanIgn);
      }
    }

    // Hapus data inti tim
    await kv.del(`token:map:${team.editToken}`);
    await kv.del(`teams:${teamSlug}`);
    await kv.srem('teams_index', teamSlug);

    return NextResponse.json({ success: true, message: 'Tim berhasil didiskualifikasi & dihapus total!' });
  } catch (error: any) {
    console.error('Error delete team:', error);
    return NextResponse.json({ error: 'Gagal menghapus tim: ' + error.message }, { status: 500 });
  }
    }
