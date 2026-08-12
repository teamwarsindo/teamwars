import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId?: string;
  ign: string;
  idDuelLinks: string;
}

export async function GET() {
  try {
    // 1. Ambil daftar seluruh slug tim
    const teamSlugs = (await kv.smembers('global:teams')) || [];

    if (teamSlugs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada tim yang ditemukan di global:teams!',
      });
    }

    // 2. Read Core Map: global:verified_users (username -> discord_id)
    const verifiedUsersHash = (await kv.hgetall<Record<string, string>>('global:verified_users')) || {};

    // Temp Object untuk menyimpan mapping baru yang bersih
    const newIgnMap: Record<string, string> = {};
    const newDiscordMap: Record<string, string> = {};
    const newDiscordIdsMap: Record<string, string> = {};
    const newDuelLinksMap: Record<string, string> = {};

    let totalPlayersProcessed = 0;
    const logs: string[] = [];

    // 3. Scan Roster Setiap Tim
    for (const slug of teamSlugs) {
      const teamData = await kv.hgetall<any>(`teams:${slug}`);
      if (!teamData || !teamData.players) continue;

      let players: PlayerItem[] = [];
      try {
        players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      } catch {
        continue;
      }

      for (const player of players) {
        totalPlayersProcessed++;

        // A. Username Discord (Core Check untuk Slug Tim)
        const usernameClean = player.discord ? player.discord.trim().toLowerCase() : '';
        // B. IGN Pemain (TETAP ASLI / TIDAK DI-LOWERCASE)
        const ignOriginal = player.ign ? player.ign.trim() : '';
        // C. ID Game / Duel Links
        const idDlClean = player.idDuelLinks ? player.idDuelLinks.trim() : '';

        // 🟢 1. Mapping global:ign (IGN Asli -> teamSlug)
        if (ignOriginal) {
          newIgnMap[ignOriginal] = slug;
        }

        // 🟢 2. Mapping global:discord (Username Lowercase -> teamSlug)
        if (usernameClean) {
          newDiscordMap[usernameClean] = slug;
        }

        // 🟢 3. Mapping global:duellinks (ID DL -> teamSlug)
        if (idDlClean) {
          newDuelLinksMap[idDlClean] = slug;
        }

        // 🟢 4. Mapping global:discord_ids (Discord ID Verified -> teamSlug)
        // Cari Discord ID berdasarkan Username di core verified_users
        let resolvedDiscordId = player.discordId;
        if (!resolvedDiscordId && usernameClean) {
          resolvedDiscordId = verifiedUsersHash[usernameClean];
        }

        if (resolvedDiscordId) {
          newDiscordIdsMap[resolvedDiscordId] = slug;

          // Sync back ke core verified_users jika belum ada
          if (usernameClean && !verifiedUsersHash[usernameClean]) {
            verifiedUsersHash[usernameClean] = resolvedDiscordId;
          }
        }
      }

      logs.push(`✅ Processed Team [${slug}]: ${players.length} players mapped.`);
    }

    // 4. RESET & OVERWRITE HASH GLOBAL MAPS
    await Promise.all([
      kv.del('global:ign'),
      kv.del('global:discord'),
      kv.del('global:discord_ids'),
      kv.del('global:duellinks'),
      kv.del('global:verified_users'),
    ]);

    // 5. SIMPAN KEMBALI HASH DENGAN STRUKTUR BARU
    const savePromises = [];

    if (Object.keys(newIgnMap).length > 0) savePromises.push(kv.hset('global:ign', newIgnMap));
    if (Object.keys(newDiscordMap).length > 0) savePromises.push(kv.hset('global:discord', newDiscordMap));
    if (Object.keys(newDiscordIdsMap).length > 0) savePromises.push(kv.hset('global:discord_ids', newDiscordIdsMap));
    if (Object.keys(newDuelLinksMap).length > 0) savePromises.push(kv.hset('global:duellinks', newDuelLinksMap));
    if (Object.keys(verifiedUsersHash).length > 0) savePromises.push(kv.hset('global:verified_users', verifiedUsersHash));

    await Promise.all(savePromises);

    return NextResponse.json({
      success: true,
      message: '🚀 MIGRASI TOTAL BERHASIL! Seluruh global mappings telah diperbarui.',
      summary: {
        totalTeamsScanned: teamSlugs.length,
        totalPlayersProcessed,
        totalIgnMapped: Object.keys(newIgnMap).length,
        totalDiscordMapped: Object.keys(newDiscordMap).length,
        totalDiscordIdsMapped: Object.keys(newDiscordIdsMap).length,
        totalDuelLinksMapped: Object.keys(newDuelLinksMap).length,
        totalVerifiedUsers: Object.keys(verifiedUsersHash).length,
      },
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan saat melakukan migrasi total.',
      },
      { status: 500 }
    );
  }
        }
