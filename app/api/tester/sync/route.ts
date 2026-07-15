import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const ROLE_DUELIST = '1525761725901570158'; // Sesuaikan jika ID role Season 6 beda

export async function POST(req: NextRequest) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !token) {
      return NextResponse.json({ success: false, error: "Bot Token atau Guild ID belum di-setting di .env" });
    }

    // 1. AMBIL SEMUA MEMBER DARI DISCORD (Pakai Pagination jika > 1000)
    let allMembers: any[] = [];
    let after = "0";
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`, {
        method: 'GET',
        headers: { 'Authorization': `Bot ${token}` }
      });
      
      if (!res.ok) {
         return NextResponse.json({ success: false, error: "Gagal fetch Discord API. Pastikan SERVER MEMBERS INTENT sudah nyala di Portal Bot." });
      }

      const members = await res.json();
      if (members.length === 0) {
        hasMore = false;
      } else {
        allMembers.push(...members);
        after = members[members.length - 1].user.id;
        if (members.length < 1000) hasMore = false;
      }
    }

    // 2. FILTER HANYA YANG PUNYA ROLE DUELIST
    const verifiedMembers = allMembers.filter((m: any) => m.roles.includes(ROLE_DUELIST));
    
    // 3. AMBIL SEMUA DATA TIM DARI DATABASE
    const allTeamSlugs = await kv.smembers('global:teams');
    const dbTeams: Record<string, any> = {};
    
    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (teamData && teamData.players) {
        dbTeams[slug] = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      }
    }

    // 4. COCOKKAN DAN SINKRONISASI KE DB
    let syncCount = 0;
    let syncLog = [];
    let mapToSave: Record<string, string> = {}; // Untuk 1 Laci Hash Besar
    let idsToSave: string[] = []; 

    for (const member of verifiedMembers) {
      const discordUsername = member.user.username.toLowerCase();
      const discordId = member.user.id;

      // Cari username ini ada di tim mana
      for (const slug of Object.keys(dbTeams)) {
        const playersArray = dbTeams[slug];
        const pIndex = playersArray.findIndex((p: any) => p.discord.trim().toLowerCase() === discordUsername);
        
        if (pIndex > -1) {
          // Hanya update jika belum punya discordId
          if (!playersArray[pIndex].discordId) {
            playersArray[pIndex].discordId = discordId; // Injeksi ID
            
            // Siapkan untuk disave
            mapToSave[discordId] = slug;
            idsToSave.push(discordId);
            
            syncLog.push(`✅ Tersinkron: ${discordUsername} -> Tim ${slug}`);
            syncCount++;
          }
          break; // Stop cari di tim lain
        }
      }
    }

    // 5. EKSEKUSI PENYIMPANAN KE REDIS BATCH
    if (syncCount > 0) {
      // Save ulang data players per tim
      for (const slug of Object.keys(dbTeams)) {
        await kv.hset(`teams:${slug}`, { players: JSON.stringify(dbTeams[slug]) });
      }
      // Save map Hash & Index global
      await kv.hset('global:discord_map', mapToSave);
      await kv.sadd('global:discord_ids', ...idsToSave);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sinkronisasi Selesai! Menemukan ${verifiedMembers.length} Duelist di Discord. Berhasil menyinkronkan ${syncCount} user baru ke Database.`,
      log: syncLog 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
