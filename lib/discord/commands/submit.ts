import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';
import {
  DeckSubmissionStore,
  sendOrUpdateLiveTracker,
} from '@/lib/discord/messages/match-briefing';
import { resolveTeamFastFromChannel } from '@/lib/discord/handlers/autocomplete-handler';

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
    const { teamSlug, teamData } = await resolveTeamFastFromChannel(channelId);

    if (!teamSlug || !teamData) {
      return {
        type: 4,
        data: {
          content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim**!',
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

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const activeMatch = schedules.find((m) => {
      const sA = getTeamSlug(m.teamAName);
      const sB = getTeamSlug(m.teamBName);
      return (sA === teamSlug || sB === teamSlug) && !(m as any).isFinished;
    });

    const submissionKey = `match:decks:${teamSlug}`;
    const store: DeckSubmissionStore = (await kv.get<DeckSubmissionStore>(submissionKey)) || {
      matchId: activeMatch?.id || 'manual',
      teamSlug,
      submittedPlayers: [],
      totalDecks: 0,
    };

    const currentCount = store.submittedPlayers.length;
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

    const uniqueInputs: string[] = Array.from(new Set<string>(inputPlayers));
    const newValidPlayers: string[] = uniqueInputs.filter(
      (name: string) => !store.submittedPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())
    );

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
    const nowIso = new Date().toISOString();

    newValidPlayers.forEach((name: string) => {
      store.submittedPlayers.push({
        name,
        submittedAt: nowIso,
        submittedBy: callerName,
      });
    });

    store.totalDecks = store.submittedPlayers.length * 2;

    const matchDateIso = activeMatch?.matchDate || new Date().toISOString();
    const newTrackerId = await sendOrUpdateLiveTracker({
      channelId,
      matchDateIso,
      submittedPlayers: store.submittedPlayers,
      existingMsgId: store.lastTrackerMessageId,
    });

    store.lastTrackerMessageId = newTrackerId;
    await kv.set(submissionKey, store);

    const addedList = newValidPlayers.map((n: string) => `• **${n}** *(2 Deck)*`).join('\n');

    return {
      type: 4,
      data: {
        content: `✅ **Berhasil Memvalidasi ${newValidPlayers.length} Pemain!**\n${addedList}\n\n📊 Total terkumpul saat ini: **${store.totalDecks} / 10 Deck** (${store.submittedPlayers.length}/5 Pemain).`,
      },
    };
  } catch (error: any) {
    return {
      type: 4,
      data: { content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`, flags: 64 },
    };
  }
}