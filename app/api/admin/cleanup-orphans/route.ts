import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST() {
  try {
    // 1. Ambil semua key tim yang aktif di database Vercel KV
    const teamKeys = await kv.keys('teams:*');
    
    const validDiscords = new Set<string>();
    const validIgns = new Set<string>();

    // 2. Kumpulkan semua Discord Username & IGN dari tim yang sah (Keranjang A)
    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.players) {
        // Parsing aman untuk format string JSON atau array langsung
        const players = typeof teamData.players === 'string' 
          ? JSON.parse(teamData.players) 
          : teamData.players;

        players.forEach((p: any) => {
          if (p.discord) {
            validDiscords.add(p.discord.toLowerCase().replace(/^@/, '').trim());
          }
          if (p.ign) {
            validIgns.add(p.ign.toLowerCase().trim());
          }
        });
      }
    }

    // 3. Ambil isi set global saat ini (Keranjang B)
    const currentDiscords = await kv.smembers('registered_discords') || [];
    const currentIgns = await kv.smembers('registered_igns') || [];

    // 4. Cari yang YATIM (Ada di Global, tapi tidak ada di Tim manapun)
    const orphanDiscords = currentDiscords.filter(
      (d) => !validDiscords.has(d.toLowerCase().replace(/^@/, '').trim())
    );
    const orphanIgns = currentIgns.filter(
      (ign) => !validIgns.has(ign.toLowerCase().trim())
    );

    // 5. Eksekusi Hapus (Sapu Bersih)
    for (const d of orphanDiscords) {
      const cleanOrphan = d.toLowerCase().replace(/^@/, '').trim();
      await kv.srem('registered_discords', d);       // Hapus dari global set
      await kv.del(`player:${cleanOrphan}`);         // Hapus key individu
    }

    for (const ign of orphanIgns) {
      await kv.srem('registered_igns', ign);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalTimDiperiksa: teamKeys.length,
        totalPemainValid: validDiscords.size,
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
