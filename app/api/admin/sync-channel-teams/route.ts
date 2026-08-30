import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface FreeDuelistPayload {
  [key: string]: unknown;
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
    // 1. Ambil seluruh data dari hash utama global:free_duelists
    const allFreeDuelists = await kv.hgetall<Record<string, string>>('global:free_duelists');

    if (!allFreeDuelists || Object.keys(allFreeDuelists).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada data di global:free_duelists untuk dibuatkan index.',
        totalIndexed: 0,
      });
    }

    const ignIndexMap: Record<string, string> = {};
    const dlIndexMap: Record<string, string> = {};
    let count = 0;

    // 2. Baca setiap entry dan mapping persis aslinya
    for (const [discordId, rawData] of Object.entries(allFreeDuelists)) {
      let data: FreeDuelistPayload;

      if (typeof rawData === 'string') {
        try {
          data = JSON.parse(rawData);
        } catch {
          continue;
        }
      } else {
        data = rawData as FreeDuelistPayload;
      }

      if (data) {
        // Simpan IGN apa adanya (as-is)
        if (data.ign) {
          ignIndexMap[data.ign] = discordId;
        }

        // Simpan ID Duel Links apa adanya (as-is, termasuk tanda '-')
        if (data.idDuelLinks) {
          dlIndexMap[data.idDuelLinks] = discordId;
        }

        count++;
      }
    }

    // 3. Reset dan tulis ulang key index
    await kv.del('global:free_duelists_ign', 'global:free_duelists_dl');

    if (Object.keys(ignIndexMap).length > 0) {
      await kv.hset('global:free_duelists_ign', ignIndexMap);
    }
    if (Object.keys(dlIndexMap).length > 0) {
      await kv.hset('global:free_duelists_dl', dlIndexMap);
    }

    return NextResponse.json({
      success: true,
      message: 'Index global:free_duelists_ign dan global:free_duelists_dl berhasil diperbarui!',
      totalIndexed: count,
      ignIndex: ignIndexMap,
      dlIndex: dlIndexMap,
    });
  } catch (error: any) {
    console.error('Gagal rebuild index free duelists:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan saat rebuild index',
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
            }
