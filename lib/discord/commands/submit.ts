import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';
import {
  sendOrUpdateLiveTracker,
  TrackerPlayer,
} from '@/lib/discord/messages/match-briefing';
import { syncCustomDeckAndSkillToMaster } from '@/lib/discord/services/master-sync';

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

function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) {
    map[opt.name] = opt.value;
  }
  return map;
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

// Helper pembuat objek Deck standar
function createEmptyDeck() {
  return {
    archetype: '',
    skill: '',
    wins: 0,
    losses: 0,
    isDead: false,
    isRepeatUsed: false,
    lastGameNumber: null,
  };
}

function createFilledDeck(archetype: string, skill: string = '') {
  return {
    archetype: archetype.trim(),
    skill: (skill || '').trim(),
    wins: 0,
    losses: 0,
    isDead: false,
    isRepeatUsed: false,
    lastGameNumber: null,
  };
}

// ⚡ EKSEKUSI COMMAND /submit (add, change, edit)
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

    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subCommandName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
    const optMap = getOptionMap(subOptions);

    // Ambil data roster tim
    const teamData = await kv.hgetall<any>(`teams:${campData.slug}`);
    const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];

    // Ambil dokumen match report dari HASH twi:match_reports
    let reportData = await kv.hget<any>('twi:match_reports', matchId);

    if (!reportData) {
      reportData = {
        matchId,
        week: 1,
        metadata: { date: new Date().toISOString().split('T')[0], streamPlatform: 'YouTube', streamer: '', referee: '', streamUrl: '' },
        teamA: { name: allData.campA?.name || '', slug: allData.campA?.slug || '', score: 0, repeatsUsed: 0, warningsUsed: 0, lineup: [] },
        teamB: { name: allData.campB?.name || '', slug: allData.campB?.slug || '', score: 0, repeatsUsed: 0, warningsUsed: 0, lineup: [] },
        games: [],
        finalScore: { teamA: 0, teamB: 0 },
        winnerTeam: null,
        isFinished: false,
      };
    }

    if (reportData.isFinished) {
      return {
        type: 4,
        data: {
          content: '⚠️ Pertandingan ini sudah selesai (`isFinished: true`). Lineup sudah dikunci.',
          flags: 64,
        },
      };
    }

    const targetTeam = reportData[teamKey];
    const currentLineup: any[] = targetTeam.lineup || [];
    let responseMessage = '';

    // ========================================================================
    // SUBCOMMAND 1: ADD (Tambah 1 s/d 5 Pemain ke Lineup)
    // ========================================================================
    if (subCommandName === 'add') {
      const inputPlayerEntries: { ign: string; count: number }[] = [];
      for (let i = 1; i <= 5; i++) {
        const ign = optMap[`pemain_${i}`];
        if (ign && typeof ign === 'string' && ign.trim()) {
          const count = Number(optMap[`deck_count_${i}`]) || 2;
          inputPlayerEntries.push({ ign: ign.trim(), count });
        }
      }

      if (inputPlayerEntries.length === 0) {
        return {
          type: 4,
          data: { content: '❌ Masukkan minimal 1 pemain pada opsi `pemain_1`!', flags: 64 },
        };
      }

      const remainingSlots = 5 - currentLineup.length;
      if (remainingSlots <= 0) {
        return {
          type: 4,
          data: {
            content: '⚠️ **Gagal Submit:** Kuota 5 pemain untuk tim ini sudah lengkap!',
            flags: 64,
          },
        };
      }

      const newValidEntries = inputPlayerEntries.filter(
        (entry) => !currentLineup.some((p) => String(p.ign || '').toLowerCase() === entry.ign.toLowerCase())
      );

      if (newValidEntries.length === 0) {
        return {
          type: 4,
          data: {
            content: '⚠️ Semua pemain yang kamu masukkan sudah terdaftar di lineup!',
            flags: 64,
          },
        };
      }

      if (newValidEntries.length > remainingSlots) {
        return {
          type: 4,
          data: {
            content: `❌ **Gagal Submit! Kuota Melebihi Batas.**\nTim ini sudah terisi **${currentLineup.length}/5 pemain**.\nSisa slot yang tersedia hanya **${remainingSlots} pemain lagi**.`,
            flags: 64,
          },
        };
      }

      const addedList: string[] = [];
      newValidEntries.forEach(({ ign, count }) => {
        const rosterMember = teamRoster.find((p) => p.ign.toLowerCase() === ign.toLowerCase());
        const idDuelLinks = rosterMember?.idDuelLinks || '';

        currentLineup.push({
          ign,
          idDuelLinks,
          totalWins: 0,
          totalLosses: 0,
          remainingLife: count,
          deck1: createEmptyDeck(),
          deck2: count === 1 ? null : createEmptyDeck(),
        });

        const dlText = idDuelLinks ? ` (${idDuelLinks})` : '';
        const statusText = count === 1 ? '*(1 Deck - Menunggu Input)*' : '*(2 Deck - Menunggu Input)*';
        addedList.push(`• **${ign}**${dlText} ${statusText}`);
      });

      responseMessage = `✅ **Berhasil Mendaftarkan ${newValidEntries.length} Pemain ke Lineup!**\n${addedList.join('\n')}`;
    }

    // ========================================================================
    // SUBCOMMAND 2: CHANGE (Ganti 1 Pemain di Lineup)
    // ========================================================================
    else if (subCommandName === 'change') {
      const oldPlayerIgn = String(optMap.pemain_lama || '').trim();
      const newPlayerIgn = String(optMap.pemain_baru || '').trim();
      const deckCount = Number(optMap.deck_count) || 2;

      if (!oldPlayerIgn || !newPlayerIgn) {
        return {
          type: 4,
          data: { content: '❌ Opsi `pemain_lama` dan `pemain_baru` wajib diisi!', flags: 64 },
        };
      }

      const oldIndex = currentLineup.findIndex(
        (p) => String(p.ign || '').toLowerCase() === oldPlayerIgn.toLowerCase()
      );

      if (oldIndex === -1) {
        return {
          type: 4,
          data: { content: `❌ Pemain lama **${oldPlayerIgn}** tidak ditemukan di lineup!`, flags: 64 },
        };
      }

      const hasPlayed = (reportData.games || []).some((g: any) => {
        const duelPlayer = teamKey === 'teamA' ? g.playerA?.ign || g.playerA : g.playerB?.ign || g.playerB;
        return String(duelPlayer || '').toLowerCase() === oldPlayerIgn.toLowerCase();
      });

      if (hasPlayed) {
        return {
          type: 4,
          data: {
            content: `❌ **Pergantian Ditolak!** Pemain **${oldPlayerIgn}** sudah memiliki riwayat duel di pertandingan ini.`,
            flags: 64,
          },
        };
      }

      const isNewAlreadyInLineup = currentLineup.some(
        (p, idx) => idx !== oldIndex && String(p.ign || '').toLowerCase() === newPlayerIgn.toLowerCase()
      );

      if (isNewAlreadyInLineup) {
        return {
          type: 4,
          data: { content: `❌ Pemain baru **${newPlayerIgn}** sudah ada di lineup!`, flags: 64 },
        };
      }

      const newRosterMember = teamRoster.find((p) => p.ign.toLowerCase() === newPlayerIgn.toLowerCase());
      const newDlId = newRosterMember?.idDuelLinks || '';

      let deck1 = createEmptyDeck();
      if (optMap.deck_1) {
        const sync1 = await syncCustomDeckAndSkillToMaster(optMap.deck_1, optMap.skill_1);
        deck1 = createFilledDeck(sync1.cleanDeck || optMap.deck_1, sync1.cleanSkill || optMap.skill_1 || '');
      }

      let deck2 = null;
      if (deckCount === 2) {
        if (optMap.deck_2) {
          const sync2 = await syncCustomDeckAndSkillToMaster(optMap.deck_2, optMap.skill_2);
          deck2 = createFilledDeck(sync2.cleanDeck || optMap.deck_2, sync2.cleanSkill || optMap.skill_2 || '');
        } else {
          deck2 = createEmptyDeck();
        }
      }

      currentLineup[oldIndex] = {
        ign: newPlayerIgn,
        idDuelLinks: newDlId,
        totalWins: 0,
        totalLosses: 0,
        remainingLife: deckCount,
        deck1,
        deck2,
      };

      responseMessage = `🔄 **Pergantian Pemain Berhasil!**\n• Keluar: **${oldPlayerIgn}**\n• Masuk: **${newPlayerIgn}** (${newDlId || '-'})`;
    }

    // ========================================================================
    // SUBCOMMAND 3: EDIT (Input / Verifikasi Detail Deck Per Pemain)
    // ========================================================================
    else if (subCommandName === 'edit') {
      const targetIgn = String(optMap.pemain || '').trim();
      if (!targetIgn) {
        return {
          type: 4,
          data: { content: '❌ Pilih pemain di lineup yang ingin diedit!', flags: 64 },
        };
      }

      const playerObj = currentLineup.find(
        (p) => String(p.ign || '').toLowerCase() === targetIgn.toLowerCase()
      );

      if (!playerObj) {
        return {
          type: 4,
          data: { content: `❌ Pemain **${targetIgn}** tidak ditemukan di lineup!`, flags: 64 },
        };
      }

      const updatedDecks: string[] = [];

      if (optMap.deck_1) {
        const sync1 = await syncCustomDeckAndSkillToMaster(optMap.deck_1, optMap.skill_1);
        const finalDeck1 = sync1.cleanDeck || optMap.deck_1;
        const finalSkill1 = sync1.cleanSkill || optMap.skill_1 || playerObj.deck1?.skill || '';

        playerObj.deck1 = {
          ...(playerObj.deck1 || createEmptyDeck()),
          archetype: finalDeck1,
          skill: finalSkill1,
        };
        updatedDecks.push(`Deck 1: **${finalDeck1}** (${finalSkill1 || '-'})`);
      }

      if (optMap.deck_2) {
        const sync2 = await syncCustomDeckAndSkillToMaster(optMap.deck_2, optMap.skill_2);
        const finalDeck2 = sync2.cleanDeck || optMap.deck_2;
        const finalSkill2 = sync2.cleanSkill || optMap.skill_2 || playerObj.deck2?.skill || '';

        playerObj.deck2 = {
          ...(playerObj.deck2 || createEmptyDeck()),
          archetype: finalDeck2,
          skill: finalSkill2,
        };
        updatedDecks.push(`Deck 2: **${finalDeck2}** (${finalSkill2 || '-'})`);
      }

      if (updatedDecks.length === 0) {
        return {
          type: 4,
          data: {
            content: '⚠️ Masukkan minimal nama `deck_1` atau `deck_2` untuk memperbarui data!',
            flags: 64,
          },
        };
      }

      responseMessage = `📝 **Berhasil Memperbarui Data Pemain:** **${targetIgn}**\n${updatedDecks.map((d) => `• ${d}`).join('\n')}`;
    }

    // ========================================================================
    // SINKRONISASI KE KV HASH twi:match_reports & LIVE TRACKER
    // ========================================================================
    targetTeam.lineup = currentLineup;
    reportData[teamKey] = targetTeam;

    // Ambil jadwal untuk deadline kick-off
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const currentMatch = schedules.find((m) => m.id === matchId);
    const matchDateIso = currentMatch?.matchDate || new Date().toISOString();

    const trackerPlayers: TrackerPlayer[] = currentLineup.map((p) => {
      let dl = p.idDuelLinks;
      if (!dl) {
        const found = teamRoster.find((r) => r.ign.toLowerCase() === (p.ign || '').toLowerCase());
        dl = found?.idDuelLinks || '';
      }
      return {
        ign: p.ign,
        idDuelLinks: dl,
        deck1: p.deck1 ? { status: p.deck1.archetype ? 'VERIFIED' : 'PENDING_INPUT', archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
        deck2: p.deck2 ? { status: p.deck2.archetype ? 'VERIFIED' : 'PENDING_INPUT', archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
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

    // Simpan pembaruan ke 1 Hash Key twi:match_reports
    await kv.hset('twi:match_reports', { [matchId]: reportData });

    return {
      type: 4,
      data: {
        content: `${responseMessage}\n\n📊 Status Lineup: **${currentLineup.length}/5 Pemain Terdaftar**.`,
        flags: 64,
      },
    };
  } catch (error: any) {
    console.error('Error in handleSubmitCommand:', error);
    return {
      type: 4,
      data: { content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`, flags: 64 },
    };
  }
        }
