import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface OldFreeDuelistData {
  discord?: string;
  discordId?: string;
  idDuelLinks?: string;
  ign?: string;
  lastTeam?: string;
  releasedAt?: string;
  teamsJoinedCount?: number | string;
}

export async function GET() {
  try {
    // 1. Scan/ambil seluruh key lama dengan pattern 'global:free_duelists:*'
    const oldKeys: string[] = [];
    let cursor = 0;

    do {
      const [nextCursor, keys] = await kv.scan(cursor, {
        match: 'global:free_duelists:*',
        count: 100,
      });
      cursor = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor;
      if (keys && keys.length > 0) {
        oldKeys.push(...keys);
      }
    } while (cursor !== 0);

    if (oldKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada data lama global:free_duelists:* yang perlu dimigrasi.',
        totalMigrated: 0,
      });
    }

    const freeDuelistsMap: Record<string, string> = {};
    const ignIndexMap: Record<string, string> = {};
    const dlIndexMap: Record<string, string> = {};
    const migratedList: any[] = [];
    const keysToDelete: string[] = [];

    // 2. Baca isi data dari setiap key lama
    for (const key of oldKeys) {
      // Lewati jika bukan key individual (safety check)
      if (
        key === 'global:free_duelists' ||
        key === 'global:free_duelists_ign' ||
        key === 'global:free_duelists_dl'
      ) {
        continue;
      }

      const data = await kv.hgetall<OldFreeDuelistData>(key);

      if (data && data.discordId) {
        const discordId = data.discordId;
        const normalizedIgn = (data.ign || '').trim().toLowerCase();
        const cleanDlId = (data.idDuelLinks || '').replace(/[^0-9]/g, '');

        const payload = {
          discord: data.discord || '',
          discordId: discordId,
          idDuelLinks: data.idDuelLinks || '',
          ign: data.ign || '',
          lastTeam: data.lastTeam || '',
          releasedAt: data.releasedAt || new Date().toISOString(),
          teamsJoinedCount: Number(data.teamsJoinedCount || 1),
        };

        // Masukkan ke Hash Utama (Field: discordId, Value: JSON string)
        freeDuelistsMap[discordId] = JSON.stringify(payload);

        // Masukkan ke Index IGN
        if (normalizedIgn) {
          ignIndexMap[normalizedIgn] = discordId;
        }

        // Masukkan ke Index ID Duel Links
        if (cleanDlId) {
          dlIndexMap[cleanDlId] = discordId;
        }

        migratedList.push(payload);
        keysToDelete.push(key);
      }
    }

    // 3. Simpan ke 3 key baru
    if (Object.keys(freeDuelistsMap).length > 0) {
      await kv.hset('global:free_duelists', freeDuelistsMap);
    }
    if (Object.keys(ignIndexMap).length > 0) {
      await kv.hset('global:free_duelists_ign', ignIndexMap);
    }
    if (Object.keys(dlIndexMap).length > 0) {
      await kv.hset('global:free_duelists_dl', dlIndexMap);
    }

    // 4. Bersihkan key-key individual lama
    if (keysToDelete.length > 0) {
      await kv.del(...keysToDelete);
    }

    return NextResponse.json({
      success: true,
      message: 'Migrasi global:free_duelists dan index berhasil!',
      totalMigrated: migratedList.length,
      migratedList,
      deletedKeysCount: keysToDelete.length,
    });
  } catch (error: any) {
    console.error('Gagal migrasi global:free_duelists:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan saat migrasi',
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
  
