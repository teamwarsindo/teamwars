import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Key Redis KV
const STATE_KEY = 'roulette:state';
const DISCORD_LOGS_KEY = 'roulette:discord_msg_ids'; // Menyimpan ID pesan yang terkirim ke Discord

export async function DELETE() {
  try {
    // 1. Ambil ID pesan-pesan log yang pernah dikirim ke Discord
    const msgIds = await kv.get<string[]>(DISCORD_LOGS_KEY) || [];

    // 2. Hapus pesan-pesan tersebut dari channel Discord
    if (msgIds.length > 0 && DISCORD_CONFIG.CHANNEL_ID) {
      for (const msgId of msgIds) {
        try {
          await discordAPI(`/channels/${DISCORD_CONFIG.CHANNEL_ID}/messages/${msgId}`, 'DELETE');
        } catch (e) {
          console.warn(`Gagal menghapus pesan Discord ID ${msgId}:`, e);
        }
      }
    }

    // 3. Ambil ulang semua master teams untuk mengembalikan sisa tim
    const teamKeys = await kv.keys('teams:*');
    const rawTeams = await Promise.all(teamKeys.map((k) => kv.hgetall<Record<string, any>>(k)));
    const masterTeams = rawTeams
      .filter((t): t is Record<string, any> => Boolean(t))
      .map((t) => ({
        name: t?.namaTim || t?.name || 'Unknown',
        logo: t?.logoTim || t?.logo || '',
      }));

    // 4. Reset ulang state di Vercel KV Redis
    const initialState = {
      masterTeams,
      remainingTeams: masterTeams, // Reset sisa tim kembali utuh 16 tim
      groupA: [],
      groupB: [],
      selectedTargetGroup: 'GROUP_A',
      celebrationWinner: null,
      spinEvent: null,
    };

    await kv.set(STATE_KEY, initialState);
    await kv.del(DISCORD_LOGS_KEY); // Clear riwayat ID pesan

    return NextResponse.json({ success: true, message: "State pengundian & chat Discord berhasil di-reset!" });
  } catch (error: any) {
    console.error("Error DELETE roulette-state:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
  }
