import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';
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

    // Ambil data roster tim untuk mencocokkan ID Duel Links
    const teamData = await kv.hgetall<any>(`teams:${campData.slug}`);
    const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];

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
    const addedList: string[] = [];

    newValidPlayers.forEach((ign) => {
      const rosterMember = teamRoster.find((p) => p.ign.toLowerCase() === ign.toLowerCase());
      const idDuelLinks = rosterMember?.idDuelLinks || '';

      currentLineup.push({
        ign,
        idDuelLinks,
        submittedBy: callerName,
        deck1: null,
        deck2: null,
      });

      const dlText = idDuelLinks ? ` (${idDuelLinks})` : '';
      addedList.push(`• **${ign}**${dlText} *(2 Deck)*`);
    });

    targetTeam.lineup = currentLineup;
    reportData[teamKey] = targetTeam;

    // Ambil jadwal untuk deadline kick-off
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const currentMatch = schedules.find((m) => m.id === matchId);
    const matchDateIso = currentMatch?.matchDate || new Date().toISOString();

    // 🔁 Refresh Live Tracker di Channel Camp dengan ID Duel Links
    const trackerPlayers: TrackerPlayer[] = currentLineup.map((p) => {
      let dl = p.idDuelLinks;
      if (!dl) {
        const found = teamRoster.find((r) => r.ign.toLowerCase() === (p.ign || p.name || '').toLowerCase());
        dl = found?.idDuelLinks || '';
      }
      return {
        ign: p.ign || p.name,
        idDuelLinks: dl,
      };
    });

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

    const totalDecks = currentLineup.length * 2;

    return {
      type: 4,
      data: {
        content: `✅ **Berhasil Memvalidasi ${newValidPlayers.length} Pemain!**\n${addedList.join('\n')}\n\n📊 Total terkumpul saat ini: **${totalDecks} / 10 Deck** (${currentLineup.length}/5 Pemain).`,
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
  
