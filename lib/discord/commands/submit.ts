import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library';
import {
  sendOrUpdateLiveTracker,
  TrackerPlayer,
} from '@/lib/discord/messages/match-briefing';

function isStaff(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    const permissions = BigInt(member?.permissions || '0');
    const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);
    return (
      isAdmin ||
      (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
      (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF)) ||
      (!!DISCORD_CONFIG.ROLE_REFEREE && roles.includes(DISCORD_CONFIG.ROLE_REFEREE))
    );
  } catch {
    return false;
  }
}

// 🔍 Lookup Cepat dari Hash discord:match_messages
async function resolveMatchAndCampFromChannel(channelId: string) {
  const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};

  for (const [matchId, rawData] of Object.entries(matchMessages)) {
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    if (data.campA?.channelId === channelId) {
      return { matchId, teamKey: 'teamA' as const, campData: data.campA, allData: data };
    }
    if (data.campB?.channelId === channelId) {
      return { matchId, teamKey: 'teamB' as const, campData: data.campB, allData: data };
    }
  }

  return { matchId: null, teamKey: null, campData: null, allData: null };
}

// 🔍 AUTOCOMPLETE IGN DARI HASH global:ign
export async function handleSubmitAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const { matchId, teamKey, campData } = await resolveMatchAndCampFromChannel(channelId);

    if (!matchId || !campData?.slug) {
      return { type: 8, data: { choices: [] } };
    }

    const options = interaction.data?.options || [];
    const focused = options.find((o: any) => o.focused);
    const searchVal = (focused?.value || '').toLowerCase();

    // 1. Ambil roster resmi tim dari Hash global:ign
    const globalIgnHash = (await kv.hgetall<Record<string, string>>('global:ign')) || {};
    const teamRoster = Object.entries(globalIgnHash)
      .filter(([_, slug]) => slug.toLowerCase() === campData.slug.toLowerCase())
      .map(([ign]) => ign);

    // 2. Ambil data report untuk memfilter yang sudah masuk lineup
    const reportData = await kv.get<any>(`match:report:${matchId}`);
    const existingLineup: any[] = reportData?.[teamKey]?.lineup || [];
    const alreadySubmitted = existingLineup.map((p) => String(p.ign || p.name || '').toLowerCase());

    const availablePlayers = teamRoster.filter(
      (ign) => !alreadySubmitted.includes(ign.toLowerCase())
    );

    const choices = availablePlayers
      .filter((ign) => ign.toLowerCase().includes(searchVal))
      .slice(0, 25)
      .map((ign) => ({
        name: ign,
        value: ign,
      }));

    return { type: 8, data: { choices } };
  } catch {
    return { type: 8, data: { choices: [] } };
  }
}

// ⚡ EKSEKUSI COMMAND /submit
export async function handleSubmitCommand(interaction: any) {
  try {
    if (!isStaff(interaction)) {
      return {
        type: 4,
        data: {
          content: '❌ Akses Ditolak! Hanya **Referee** dan **Admin** yang dapat menggunakan command ini.',
          flags: 64,
        },
      };
    }

    const channelId = interaction.channel_id;
    const { matchId, teamKey, campData, allData } = await resolveMatchAndCampFromChannel(channelId);

    if (!matchId || !campData || !teamKey) {
      return {
        type: 4,
        data: {
          content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim** yang aktif!',
          flags: 64,
        },
      };
    }

    const options = interaction.data?.options || [];
    const inputPlayers: string[] = options
      .filter((o: any) => typeof o.name === 'string' && o.name.startsWith('pemain_') && o.value)
      .map((o: any) => String(o.value).trim());

    if (inputPlayers.length === 0) {
      return {
        type: 4,
        data: { content: '❌ Masukkan minimal 1 pemain pada opsi `pemain_1`!', flags: 64 },
      };
    }

    // Ambil atau inisialisasi dokumen match:report
    const reportKey = `match:report:${matchId}`;
    let reportData = (await kv.get<any>(reportKey)) || {
      matchId,
      metadata: { date: new Date().toISOString() },
      teamA: { slug: allData.campA?.slug || '', lineup: [], score: 0, repeatsUsed: 0 },
      teamB: { slug: allData.campB?.slug || '', lineup: [], score: 0, repeatsUsed: 0 },
      games: [],
      finalScore: { teamA: 0, teamB: 0 },
      winnerTeam: null,
    };

    const targetTeam = reportData[teamKey];
    const currentLineup: any[] = targetTeam.lineup || [];
    const currentCount = currentLineup.length;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      return {
        type: 4,
        data: {
          content: '⚠️ **Gagal Submit:** Kuota 5 pemain (10 deck) untuk tim ini sudah lengkap!',
          flags: 64,
        },
      };
    }

    // Filter duplikasi input
    const uniqueInputs: string[] = Array.from(new Set<string>(inputPlayers));
    const newValidPlayers: string[] = uniqueInputs.filter(
      (name) => !currentLineup.some((p) => String(p.ign || p.name || '').toLowerCase() === name.toLowerCase())
    );

    if (newValidPlayers.length === 0) {
      return {
        type: 4,
        data: {
          content: '⚠️ Semua pemain yang kamu masukkan sudah terdaftar di lineup!',
          flags: 64,
        },
      };
    }

    if (newValidPlayers.length > remainingSlots) {
      return {
        type: 4,
        data: {
          content: `❌ **Gagal Submit! Kuota Melebihi Batas.**\nTim ini sudah terisi **${currentCount}/5 pemain (${currentCount * 2}/10 deck)**.\nSisa slot yang tersedia hanya **${remainingSlots} pemain lagi**. Silakan ulangi command sesuai kuota.`,
          flags: 64,
        },
      };
    }

    const callerName = interaction.member?.user?.username || 'Staff';
    newValidPlayers.forEach((ign) => {
      currentLineup.push({
        ign,
        submittedBy: callerName,
        deck1: null,
        deck2: null,
      });
    });

    targetTeam.lineup = currentLineup;
    reportData[teamKey] = targetTeam;

    // Ambil jadwal untuk deadline kick-off
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const currentMatch = schedules.find((m) => m.id === matchId);
    const matchDateIso = currentMatch?.matchDate || new Date().toISOString();

    // 🔁 Refresh Live Tracker di Channel Camp
    const trackerPlayers: TrackerPlayer[] = currentLineup.map((p) => ({ ign: p.ign || p.name }));
    const newTrackerId = await sendOrUpdateLiveTracker({
      channelId,
      matchDateIso,
      submittedPlayers: trackerPlayers,
      existingMsgId: campData.trackerMsgId,
    });

    // Simpan pembaruan ID pesan tracker ke Hash discord:match_messages
    if (teamKey === 'teamA') {
      allData.campA.trackerMsgId = newTrackerId;
    } else {
      allData.campB.trackerMsgId = newTrackerId;
    }
    await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(allData) });

    // Simpan pembaruan lineup ke match:report:${matchId}
    await kv.set(reportKey, reportData);

    const addedList = newValidPlayers.map((n: string) => `• **${n}** *(2 Deck)*`).join('\n');
    const totalDecks = currentLineup.length * 2;

    return {
      type: 4,
      data: {
        content: `✅ **Berhasil Memvalidasi ${newValidPlayers.length} Pemain!**\n${addedList}\n\n📊 Total terkumpul saat ini: **${totalDecks} / 10 Deck** (${currentLineup.length}/5 Pemain).`,
        flags: 64,
      },
    };
  } catch (error: any) {
    return {
      type: 4,
      data: { content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`, flags: 64 },
    };
  }
    }
