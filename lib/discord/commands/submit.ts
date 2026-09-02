import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
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

function isToday(dateIso?: string): boolean {
  if (!dateIso) return false;
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const match = new Date(dateIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return now === match;
}

// 🔍 Parser format "IGN (ID)" menjadi 2 nilai terpisah
function parseIgnAndId(input: string): { ign: string; idDuelLinks: string } {
  const match = input.match(/^(.*?)(?:\s*\(([\d\-]+)\))?$/);
  if (!match) return { ign: input.trim(), idDuelLinks: '' };
  return {
    ign: match[1].trim(),
    idDuelLinks: (match[2] || '').trim(),
  };
}

// ⚡ Lookup Instan O(1) dari Hash twi:active_camp_channels
async function resolveMatchAndCampFromChannel(channelId: string) {
  const activeCamp = await kv.hget<any>('twi:active_camp_channels', channelId);
  if (!activeCamp || !activeCamp.matchId || !activeCamp.teamKey) {
    return { matchId: null, teamKey: null, campData: null };
  }

  if (!isToday(activeCamp.matchDate)) {
    return { matchId: null, teamKey: null, campData: null, isExpired: true };
  }

  return {
    matchId: activeCamp.matchId as string,
    teamKey: activeCamp.teamKey as 'teamA' | 'teamB',
    campData: activeCamp,
  };
}

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
    const resolved = await resolveMatchAndCampFromChannel(channelId);

    if ((resolved as any).isExpired) {
      return {
        type: 4,
        data: {
          content: '⚠️ Pertandingan di camp ini tidak dijadwalkan untuk hari ini atau sudah berakhir.',
          flags: 64,
        },
      };
    }

    const { matchId, teamKey, campData } = resolved;

    if (!matchId || !campData || !teamKey) {
      return {
        type: 4,
        data: {
          content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim** yang aktif bertanding hari ini!',
          flags: 64,
        },
      };
    }

    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subCommandName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
    const optMap = getOptionMap(subOptions);

    // Ambil data roster tim langsung dari hash profil tim
    const teamData = await kv.hgetall<any>(`teams:${campData.slug}`);
    const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];

    // Ambil dokumen match report dari HASH twi:match_reports
    let reportData = await kv.hget<any>('twi:match_reports', matchId);

    if (!reportData) {
      reportData = {
        matchId,
        week: campData.week || 1,
        metadata: {
          date: campData.matchDate ? campData.matchDate.split('T')[0] : new Date().toISOString().split('T')[0],
          streamPlatform: 'YouTube',
          streamer: '',
          referee: '',
          streamUrl: '',
        },
        teamA: {
          name: teamKey === 'teamA' ? campData.name : '',
          slug: teamKey === 'teamA' ? campData.slug : '',
          score: 0,
          repeatsUsed: 0,
          warningsUsed: 0,
          lineup: [],
        },
        teamB: {
          name: teamKey === 'teamB' ? campData.name : '',
          slug: teamKey === 'teamB' ? campData.slug : '',
          score: 0,
          repeatsUsed: 0,
          warningsUsed: 0,
          lineup: [],
        },
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
      const inputPlayerEntries: { rawInput: string; count: number }[] = [];
      for (let i = 1; i <= 5; i++) {
        const raw = optMap[`pemain_${i}`];
        if (raw && typeof raw === 'string' && raw.trim()) {
          const count = Number(optMap[`deck_count_${i}`]) || 2;
          inputPlayerEntries.push({ rawInput: raw.trim(), count });
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

      const parsedEntries = inputPlayerEntries.map((item) => {
        const parsed = parseIgnAndId(item.rawInput);
        let idDl = parsed.idDuelLinks;
        if (!idDl) {
          const found = teamRoster.find((p) => p.ign.toLowerCase() === parsed.ign.toLowerCase());
          idDl = found?.idDuelLinks || '';
        }
        return { ign: parsed.ign, idDuelLinks: idDl, count: item.count };
      });

      const newValidEntries = parsedEntries.filter(
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
      newValidEntries.forEach(({ ign, idDuelLinks, count }) => {
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
      if (currentLineup.length === 0) {
        return {
          type: 4,
          data: {
            content: '⚠️ **Lineup tim ini masih kosong!** Daftarkan pemain terlebih dahulu dengan `/submit add`.',
            flags: 64,
          },
        };
      }

      const rawOld = String(optMap.pemain_lama || '');
      const rawNew = String(optMap.pemain_baru || '');

      if (rawOld === 'EMPTY_LINEUP') {
        return {
          type: 4,
          data: {
            content: '⚠️ Lineup tim masih kosong. Silakan gunakan `/submit add` terlebih dahulu!',
            flags: 64,
          },
        };
      }

      const oldParsed = parseIgnAndId(rawOld);
      const newParsed = parseIgnAndId(rawNew);
      const deckCount = Number(optMap.deck_count) || 2;

      if (!oldParsed.ign || !newParsed.ign) {
        return {
          type: 4,
          data: { content: '❌ Opsi `pemain_lama` dan `pemain_baru` wajib diisi!', flags: 64 },
        };
      }

      const oldIndex = currentLineup.findIndex(
        (p) => String(p.ign || '').toLowerCase() === oldParsed.ign.toLowerCase()
      );

      if (oldIndex === -1) {
        return {
          type: 4,
          data: { content: `❌ Pemain lama **${oldParsed.ign}** tidak ditemukan di lineup!`, flags: 64 },
        };
      }

      const hasPlayed = (reportData.games || []).some((g: any) => {
        const duelPlayer = teamKey === 'teamA' ? g.playerA?.ign || g.playerA : g.playerB?.ign || g.playerB;
        return String(duelPlayer || '').toLowerCase() === oldParsed.ign.toLowerCase();
      });

      if (hasPlayed) {
        return {
          type: 4,
          data: {
            content: `❌ **Pergantian Ditolak!** Pemain **${oldParsed.ign}** sudah memiliki riwayat duel di pertandingan ini.`,
            flags: 64,
          },
        };
      }

      const isNewAlreadyInLineup = currentLineup.some(
        (p, idx) => idx !== oldIndex && String(p.ign || '').toLowerCase() === newParsed.ign.toLowerCase()
      );

      if (isNewAlreadyInLineup) {
        return {
          type: 4,
          data: { content: `❌ Pemain baru **${newParsed.ign}** sudah ada di lineup!`, flags: 64 },
        };
      }

      let newDlId = newParsed.idDuelLinks;
      if (!newDlId) {
        const rosterMember = teamRoster.find((p) => p.ign.toLowerCase() === newParsed.ign.toLowerCase());
        newDlId = rosterMember?.idDuelLinks || '';
      }

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
        ign: newParsed.ign,
        idDuelLinks: newDlId,
        totalWins: 0,
        totalLosses: 0,
        remainingLife: deckCount,
        deck1,
        deck2,
      };

      responseMessage = `🔄 **Pergantian Pemain Berhasil!**\n• Keluar: **${oldParsed.ign}**\n• Masuk: **${newParsed.ign}** (${newDlId || '-'})`;
    }

    // ========================================================================
    // SUBCOMMAND 3: EDIT (Input / Verifikasi Detail Deck Per Pemain)
    // ========================================================================
    else if (subCommandName === 'edit') {
      if (currentLineup.length === 0) {
        return {
          type: 4,
          data: {
            content: '⚠️ **Lineup tim ini masih kosong!** Daftarkan pemain terlebih dahulu dengan `/submit add`.',
            flags: 64,
          },
        };
      }

      const rawPemain = String(optMap.pemain || '');
      if (rawPemain === 'EMPTY_LINEUP') {
        return {
          type: 4,
          data: {
            content: '⚠️ Lineup tim masih kosong. Daftarkan pemain terlebih dahulu dengan `/submit add`!',
            flags: 64,
          },
        };
      }

      const parsedTarget = parseIgnAndId(rawPemain);
      if (!parsedTarget.ign) {
        return {
          type: 4,
          data: { content: '❌ Pilih pemain di lineup yang ingin diedit!', flags: 64 },
        };
      }

      const playerObj = currentLineup.find(
        (p) => String(p.ign || '').toLowerCase() === parsedTarget.ign.toLowerCase()
      );

      if (!playerObj) {
        return {
          type: 4,
          data: { content: `❌ Pemain **${parsedTarget.ign}** tidak ditemukan di lineup!`, flags: 64 },
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

      responseMessage = `📝 **Berhasil Memperbarui Data Pemain:** **${parsedTarget.ign}**\n${updatedDecks.map((d) => `• ${d}`).join('\n')}`;
    }

    // ========================================================================
    // SINKRONISASI KE KV HASH twi:match_reports & LIVE TRACKER
    // ========================================================================
    targetTeam.lineup = currentLineup;
    reportData[teamKey] = targetTeam;

    const matchDateIso = campData.matchDate || new Date().toISOString();

    const trackerPlayers: TrackerPlayer[] = currentLineup.map((p) => ({
      ign: p.ign,
      idDuelLinks: p.idDuelLinks || '',
      deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
      deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
    }));

    const newSubmitMsgId = await sendOrUpdateLiveTracker({
      channelId,
      matchDateIso,
      week: reportData.week,
      submittedPlayers: trackerPlayers,
      existingMsgId: campData.submitMsgId,
    });

    campData.submitMsgId = newSubmitMsgId;
    await kv.hset('twi:active_camp_channels', { [channelId]: campData });
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
