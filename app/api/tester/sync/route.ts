import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function GET(request: Request) {
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;

  if (!BOT_TOKEN || !GUILD_ID) {
    return NextResponse.json({ error: 'Missing BOT_TOKEN or GUILD_ID' }, { status: 500 });
  }

  try {
    // 1. Fetch members dari Discord API (Paginasi)
    let allMembers: any[] = [];
    let lastId = '0';
    let keepFetching = true;

    while (keepFetching) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000&after=${lastId}`,
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      );

      if (!res.ok) throw new Error(`Discord API Error: ${res.statusText}`);

      const members = await res.json();
      if (members.length === 0) {
        keepFetching = false;
        break;
      }
      allMembers.push(...members);
      lastId = members[members.length - 1].user.id;
    }

    // 2. Filter hanya yang punya role Duelist
    const duelistMembers = allMembers.filter((m: any) =>
      m.roles.includes(DISCORD_CONFIG.ROLE_DUELIST)
    );

    // 3. Ambil semua key tim dari Vercel KV
    const teamKeys = await kv.keys('teams:*');
    
    let successCount = 0;
    let errorCount = 0;

    // 4. Proses Overwrite (Cocokkan Discord Username dengan DB Tim)
    for (const duelist of duelistMembers) {
      const userId = duelist.user.id;
      // Normalisasi username untuk pencarian
      const username = duelist.user.username.trim().toLowerCase(); 

      let foundTeamSlug = null;
      let matchedTeamKey = null;
      let currentPlayersArray: any[] = [];

      // Cari user ini ada di tim mana
      for (const key of teamKeys) {
        const teamData: any = await kv.hgetall(key);
        if (teamData && teamData.players) {
          // Handle parse jika players disimpan sebagai string JSON
          const players = typeof teamData.players === 'string' 
            ? JSON.parse(teamData.players) 
            : teamData.players;

          const pIdx = players.findIndex((p: any) => 
            p.discord && p.discord.trim().toLowerCase() === username
          );

          if (pIdx > -1) {
            foundTeamSlug = key.replace('teams:', '');
            matchedTeamKey = key;
            currentPlayersArray = players;
            break; // Berhenti mencari tim, lanjut ke eksekusi overwrite
          }
        }
      }

      // 5. Eksekusi Overwrite menggunakan logika yang Anda berikan
      if (foundTeamSlug && matchedTeamKey) {
        try {
          const pIdx = currentPlayersArray.findIndex((p: any) => 
            p.discord && p.discord.trim().toLowerCase() === username
          );
          
          if (pIdx > -1) {
            // 1. Update id discord di dalam list players pada hash tim
            currentPlayersArray[pIdx].discordId = userId;
            await kv.hset(matchedTeamKey, { players: JSON.stringify(currentPlayersArray) });
            
            // 2. Simpan/Overwrite mapping user ID ke tim slug di global:discord_map
            await kv.hset('global:discord_map', { [userId]: foundTeamSlug });
            
            successCount++;
          }
        } catch (e) {
          console.error(`Gagal memperbarui data KV untuk user ${username}:`, e);
          errorCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sinkronisasi Overwrite Selesai',
      stats: {
        total_duelist_di_discord: duelistMembers.length,
        total_tim_diperiksa: teamKeys.length,
        data_berhasil_dioverwrite: successCount,
        data_gagal_dioverwrite: errorCount,
      }
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
