import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST() {
  try {
    const teamKeys = await kv.keys('teams:*');

    // Gunakan Set untuk mempercepat perbandingan (disimpan dalam bentuk lowercase/bersih)
    const validDiscordSet = new Set<string>();
    const validIgnSet = new Set<string>();

    // 1. Kumpulkan semua pemain yang SAH dari seluruh tim aktif
    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.players) {
        const players = typeof teamData.players === 'string' 
          ? JSON.parse(teamData.players) 
          : teamData.players;

        players.forEach((p: any) => {
          if (p.discord) {
            // Standarisasi perbandingan: lowercase, tanpa spasi, tanpa @
            validDiscordSet.add(p.discord.toLowerCase().replace(/^@/, '').trim());
          }
          if (p.ign) {
            validIgnSet.add(p.ign.toLowerCase().trim());
          }
        });
      }
    }

    // 2. Ambil data asli/mentah dari array Global (beserta huruf besar/kecil/simbol aslinya)
    const rawGlobalDiscords: string[] = await kv.smembers('registered_discords') || [];
    const rawGlobalIgns: string[] = await kv.smembers('registered_igns') || [];

    // 3. Filter siapa saja yang YATIM (Ada di Global, tapi tidak terdeteksi di tim sah)
    const orphanDiscords = rawGlobalDiscords.filter((rawDiscord) => {
      const standardizedDiscord = rawDiscord.toLowerCase().replace(/^@/, '').trim();
      return !validDiscordSet.has(standardizedDiscord);
    });

    const orphanIgns = rawGlobalIgns.filter((rawIgn) => {
      const standardizedIgn = rawIgn.toLowerCase().trim();
      return !validIgnSet.has(standardizedIgn);
    });

    // 4. Proses Sapu Bersih (Menggunakan String Asli agar SREM sukses 100%)
    for (const d of orphanDiscords) {
      // SREM wajib menggunakan raw string dari database
      await kv.srem('registered_discords', d);
      
      // Kunci individu player selalu di-set lowercase di kode registrasi lu, jadi kita hapus versi lowercasenya
      const cleanKey = d.toLowerCase().replace(/^@/, '').trim();
      await kv.del(`player:${cleanKey}`);
    }

    for (const ign of orphanIgns) {
      await kv.srem('registered_igns', ign);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalTimDiperiksa: teamKeys.length,
        totalPemainValid: validDiscordSet.size,
        sampahDiscordDihapus: orphanDiscords.length,
        sampahIgnDihapus: orphanIgns.length,
      },
    });
  } catch (error: any) {
    console.error('Error cleanup orphans:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
        }
