import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST() {
  try {
    const teamKeys = await kv.keys('teams:*');
    const verifiedUsersData = await kv.hgetall('global:verified_users') || {};
    const verifiedMap = verifiedUsersData as Record<string, string>;

    const validPlayers: any[] = [];
    const validTeams = new Set<string>();

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.players) {
        const teamSlug = key.replace('teams:', '');
        validTeams.add(teamSlug);

        const players = typeof teamData.players === 'string'
          ? JSON.parse(teamData.players)
          : teamData.players;

        players.forEach((p: any) => {
          validPlayers.push({
            ...p,
            teamSlug: teamSlug,
            namaTim: teamData.namaTim
          });
        });
      }
    }

    // NUKE (HAPUS TOTAL)
    await kv.del('global:discord');
    await kv.del('global:discord_ids'); 
    await kv.del('global:ign');
    await kv.del('global:duellinks');
    await kv.del('global:teams');       
    
    const playerKeys = await kv.keys('player:*');
    if (playerKeys.length > 0) {
      await kv.del(...playerKeys);
    }

    // REBUILD (BANGUN ULANG) - TANPA LOWERCASE UNTUK VALUE!
    for (const slug of Array.from(validTeams)) {
      await kv.sadd('global:teams', slug);
    }

    let rebuildCount = 0;
    for (const p of validPlayers) {
      // Ambil STRING ASLI persis seperti inputan form (cuma bersihin @ dan spasi depan/belakang)
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const originalId = p.idDuelLinks ? p.idDuelLinks.toString().trim() : '';

      // Untuk key pencarian (gembok), kita tetep butuh lowercase biar sistem nggak bingung
      const searchKeyDiscord = originalDiscord.toLowerCase();

      if (originalDiscord) {
        // 1. Simpan STRING ASLI ke global (Huruf besar/kecil dipertahankan)
        await kv.sadd('global:discord', originalDiscord);
        
        // 2. Cari ID Angka (Coba pakai string asli dulu, kalau gagal coba pakai lowercase)
        const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord];
        if (discordId) {
            await kv.sadd('global:discord_ids', discordId);
        }

        // 3. Simpan STRING ASLI ke profil player
        await kv.set(`player:${searchKeyDiscord}`, {
          teamId: p.teamSlug,
          namaTim: p.namaTim,
          ign: originalIgn,          // Simpan IGN Asli (Kapital dipertahankan)
          discord: originalDiscord,  // Simpan Discord Asli
          role: p.role || 'Anggota'
        });
      }
      
      if (originalIgn) {
        // 4. Masukkan IGN Asli ke global
        await kv.sadd('global:ign', originalIgn);
      }
      
      if (originalId) {
        await kv.sadd('global:duellinks', originalId);
      }
      
      rebuildCount++;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalTimDirebuild: validTeams.size,
        totalPemainDirebuild: rebuildCount,
        status: "Nuke & Rebuild Selesai! Huruf kapital player dipertahankan."
      }
    });

  } catch (error: any) {
    console.error('Nuke & Rebuild Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
        }
    
