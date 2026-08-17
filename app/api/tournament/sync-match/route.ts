import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library/types';
import { getTournamentWeekNumber } from '@/app/tournament/_library/calculator';

// Konfigurasi Environment Bot Discord & Server Guild
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const MATCH_CATEGORY_ID = process.env.DISCORD_MATCH_CATEGORY_ID; // Kategori Channel Discord

// Helper fetch Discord API
async function discordApiRequest(endpoint: string, method: string = 'GET', body?: any) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    throw new Error('Konfigurasi DISCORD_BOT_TOKEN atau DISCORD_GUILD_ID belum diset di .env');
  }

  const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API Error [${res.status}]: ${errText}`);
  }

  return res.status !== 204 ? await res.json() : null;
}

// 🟢 Helper membuat text channel match Discord jika belum ada
async function createOrUpdateMatchChannel(match: MatchScheduleItem, weekName: string) {
  const channelName = `w${match.weekNumber || 1}-${match.teamAName}-vs-${match.teamBName}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-');

  // Cek apakah channelId sudah tersimpan di match
  if (match.discordChannelId) {
    console.log(`[DISCORD] Channel untuk match ${match.id} sudah ada: ${match.discordChannelId}`);
    return match.discordChannelId;
  }

  // Siapkan Permission Overwrites (Jika ada discordId referee/streamer)
  const permissionOverwrites: any[] = [];

  if (match.refereeDiscordId) {
    permissionOverwrites.push({
      id: match.refereeDiscordId,
      type: 1, // 1 = Member
      allow: '1024', // View Channel
    });
  }

  if (match.streamerDiscordId) {
    permissionOverwrites.push({
      id: match.streamerDiscordId,
      type: 1,
      allow: '1024',
    });
  }

  // Buat Channel Baru di Guild Discord
  const newChannel = await discordApiRequest(`/guilds/${DISCORD_GUILD_ID}/channels`, 'POST', {
    name: channelName,
    type: 0, // 0 = Guild Text Channel
    parent_id: MATCH_CATEGORY_ID || undefined,
    topic: `Match: ${match.teamAName} vs ${match.teamBName} | ${weekName}`,
    permission_overwrites: permissionOverwrites.length > 0 ? permissionOverwrites : undefined,
  });

  return newChannel?.id || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || (body.matchId ? 'SINGLE' : 'WEEK');

    // 1. AMBIL SELURUH DATA SCHEDULE DARI VERCEL KV
    const schedules = (await kv.get<MatchScheduleItem[]>('tournament_schedules')) || [];

    if (schedules.length === 0) {
      return NextResponse.json(
        { error: 'Data tournament_schedules tidak ditemukan di KV' },
        { status: 404 }
      );
    }

    let isModified = false;
    let syncedCount = 0;

    // =========================================================================
    // 🟢 SINKRONISASI MASSAL SEMUA MATCH PADA WEEK TERTENTU (ACTION: WEEK)
    // =========================================================================
    if (action === 'WEEK') {
      let targetWeekStr = body.targetWeek;

      // Jika tidak diisi atau "AUTO", hitung nomor minggu saat ini dari library
      if (!targetWeekStr || targetWeekStr.toUpperCase() === 'AUTO') {
        const currentWeekNum = getTournamentWeekNumber();
        targetWeekStr = `Week ${currentWeekNum}`;
      }

      // Ekstrak angka week (contoh: "Week 3" -> 3)
      const weekNumberTarget = parseInt(targetWeekStr.replace(/[^0-9]/g, ''), 10) || 1;

      console.log(`[SYNC-MATCH] Memproses batch sync channel untuk Week ${weekNumberTarget}...`);

      for (let i = 0; i < schedules.length; i++) {
        const m = schedules[i];
        const matchWeek = Number(m.weekNumber) || getTournamentWeekNumber(m.matchDate);

        // Filter hanya match di minggu bersangkutan
        if (matchWeek === weekNumberTarget) {
          try {
            const channelId = await createOrUpdateMatchChannel(m, targetWeekStr);
            if (channelId && m.discordChannelId !== channelId) {
              schedules[i].discordChannelId = channelId;
              isModified = true;
            }
            syncedCount++;
          } catch (err: any) {
            console.error(`Gagal sync Discord match ${m.id}:`, err.message);
          }
        }
      }

      // Simpan perubahan ID channel kembali ke KV
      if (isModified) {
        await kv.set('tournament_schedules', schedules);
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil sinkronisasi ${syncedCount} match untuk ${targetWeekStr}.`,
        targetWeek: targetWeekStr,
        syncedCount,
      });
    }

    // =========================================================================
    // 🟢 SINKRONISASI SINGLE MATCH (ACTION: SINGLE)
    // =========================================================================
    if (action === 'SINGLE' || body.matchId) {
      const matchId = body.matchId;
      const targetMatchIndex = schedules.findIndex((m) => m.id === matchId);

      if (targetMatchIndex === -1) {
        return NextResponse.json({ error: `Match ${matchId} tidak ditemukan` }, { status: 404 });
      }

      const match = schedules[targetMatchIndex];
      const matchWeek = Number(match.weekNumber) || getTournamentWeekNumber(match.matchDate);
      const weekName = body.weekName || `Week ${matchWeek}`;

      const channelId = await createOrUpdateMatchChannel(match, weekName);
      if (channelId && match.discordChannelId !== channelId) {
        schedules[targetMatchIndex].discordChannelId = channelId;
        await kv.set('tournament_schedules', schedules);
      }

      return NextResponse.json({
        success: true,
        message: `Match ${matchId} berhasil disinkronkan ke Discord.`,
        channelId,
      });
    }

    return NextResponse.json(
      { error: 'Aksi tidak valid. Harap kirimkan action: "WEEK" atau matchId.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[SYNC-MATCH FATAL ERROR]:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    );
  }
      }
            
