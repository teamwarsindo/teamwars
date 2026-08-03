import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST() {
  try {
    // 1. Ambil semua key tim yang sah & map verifikasi discord
    const teamKeys = await kv.keys('teams:*');
    const verifiedUsersData = (await kv.hgetall('global:verified_users')) || {};
    const verifiedMap = verifiedUsersData as Record<string, string>;

    const validPlayers: any[] = [];
    const validTeams = new Set<string>();

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.players) {
        const teamSlug = key.replace('teams:', '');
        validTeams.add(teamSlug);

        const players =
          typeof teamData.players === 'string'
            ? JSON.parse(teamData.players)
            : teamData.players;

        if (Array.isArray(players)) {
          players.forEach((p: any) => {
            validPlayers.push(p);
          });
        }
      }
    }

    // 2. NUKE: Hapus Set Global Lama
    await kv.del('global:discord');
    await kv.del('global:discord_ids');
    await kv.del('global:ign');
    await kv.del('global:duellinks');
    await kv.del('global:teams');
    await kv.del('global:duelId'); // Hapus key legacy jika ada

    // BASMI SELURUH KEY SPAM player:* DARI REDIS
    const spamPlayerKeys = await kv.keys('player:*');
    if (spamPlayerKeys.length > 0) {
      await kv.del(...spamPlayerKeys);
    }

    // 3. REBUILD: HANYA SET GLOBAL RESMI (Preserve Casing / Huruf Besar-Kecil)
    for (const slug of Array.from(validTeams)) {
      await kv.sadd('global:teams', slug);
    }

    let rebuildCount = 0;
    for (const p of validPlayers) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const originalId = p.idDuelLinks ? p.idDuelLinks.toString().trim() : '';

      if (originalDiscord) {
        // Simpan username Discord asli ke set global:discord
        await kv.sadd('global:discord', originalDiscord);

        // Cari ID angka dari buku besar global:verified_users
        const searchKey = originalDiscord.toLowerCase();
        const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKey];
        if (discordId) {
          await kv.sadd('global:discord_ids', discordId);
        }
      }

      if (originalIgn) {
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
        totalTim: validTeams.size,
        totalPemain: rebuildCount,
        spamPlayerKeysDihapus: spamPlayerKeys.length,
      },
    });
  } catch (error: any) {
    console.error('Cleanup Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
        }
