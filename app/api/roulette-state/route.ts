import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { buildRouletteLogEmbed, buildRouletteResetEmbed } from '@/lib/discord/messages/roulette';

const KV_KEY_ROULETTE = 'twi:roulette_state';
const KV_KEY_LOGS = 'twi:roulette_logs';

export interface TeamItem {
  name: string;
  logo: string;
  createdAt?: string;
}

export interface LogItem {
  id: string;
  timestamp: string;
  teamName: string;
  teamLogo: string;
  targetGroup: "Group A" | "Group B";
  slotNumber: number;
  discordMessageId?: string;
}

export interface RouletteState {
  remainingTeams: TeamItem[];
  groupA: TeamItem[];
  groupB: TeamItem[];
  selectedTargetGroup?: "GROUP_A" | "GROUP_B";
  celebrationWinner?: TeamItem | null;
  resetMessageId?: string | null;
  spinEvent?: {
    winningIndex: number;
    targetAngle: number;
    startTime: number;
    durationMs: number;
    targetGroup: "Group A" | "Group B";
  } | null;
}

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    let masterTeams: TeamItem[] = [];

    if (teamKeys && teamKeys.length > 0) {
      const rawTeams = await Promise.all(
        teamKeys.map((key) => kv.hgetall<Record<string, any>>(key))
      );

      masterTeams = rawTeams
        .filter((team): team is Record<string, any> => Boolean(team))
        .map((team) => ({
          name: team?.namaTim || team?.name || 'Unknown Team',
          logo: team?.logoTim || team?.logo || '/logo.webp',
          createdAt: team?.waktuRegis || team?.createdAt || new Date(0).toISOString(),
        }))
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    }

    const currentState = await kv.get<RouletteState>(KV_KEY_ROULETTE);
    const logs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];

    if (!currentState) {
      return NextResponse.json({
        masterTeams,
        remainingTeams: masterTeams,
        groupA: [],
        groupB: [],
        selectedTargetGroup: "GROUP_A",
        logs,
        celebrationWinner: null,
        resetMessageId: null,
        spinEvent: null,
      });
    }

    return NextResponse.json({
      masterTeams,
      logs,
      ...currentState,
    });
  } catch (error) {
    console.error('Error GET Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remainingTeams, groupA, groupB, selectedTargetGroup, celebrationWinner, spinEvent, newLog } = body;

    const currentState = (await kv.get<RouletteState>(KV_KEY_ROULETTE)) || ({} as RouletteState);
    let currentResetMsgId = currentState.resetMessageId || null;
    
    // Hapus pesan "Reset Draw" jika roda mulai diputar
    if (spinEvent && currentResetMsgId) {
      await discordAPI(
        `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/${currentResetMsgId}`,
        'DELETE'
      ).catch(() => null);
      currentResetMsgId = null;
    }

    // 1. Simpan State Pengundian ke KV
    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams,
      groupA,
      groupB,
      selectedTargetGroup: selectedTargetGroup || "GROUP_A",
      celebrationWinner: celebrationWinner || null,
      resetMessageId: currentResetMsgId,
      spinEvent: spinEvent || null,
    });

    // 2. Kirim Log Tim Terpilih Baru ke Discord
    if (newLog) {
      const embedPayload = buildRouletteLogEmbed({
        teamName: newLog.teamName,
        teamLogo: newLog.teamLogo,
        targetGroup: newLog.targetGroup,
        slotNumber: newLog.slotNumber,
      });

      const resDiscord = await discordAPI(
        `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages`,
        'POST',
        embedPayload
      );

      const messageId = resDiscord?.id || undefined;
      const logWithMsgId: LogItem = { ...newLog, discordMessageId: messageId };

      const existingLogs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];
      const updatedLogs = [logWithMsgId, ...existingLogs];
      await kv.set(KV_KEY_LOGS, updatedLogs);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error POST Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const currentState = await kv.get<RouletteState>(KV_KEY_ROULETTE);
    const existingLogs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];

    // 1. Kumpulkan seluruh ID pesan yang perlu dihapus dari Discord
    const messageIdsToDelete: string[] = [];

    for (const log of existingLogs) {
      if (log.discordMessageId) {
        messageIdsToDelete.push(log.discordMessageId);
      }
    }

    if (currentState?.resetMessageId) {
      messageIdsToDelete.push(currentState.resetMessageId);
    }

    // 2. Eksekusi BULK DELETE ke Discord API sekaligus
    if (messageIdsToDelete.length > 0) {
      if (messageIdsToDelete.length === 1) {
        // Jika hanya ada 1 pesan
        await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/${messageIdsToDelete[0]}`,
          'DELETE'
        ).catch(() => null);
      } else {
        // Jika banyak pesan (16, 20, dst), hapus sekaligus dalam 1 request!
        await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/bulk-delete`,
          'POST',
          { messages: messageIdsToDelete }
        ).catch((err) => console.error('Gagal Bulk Delete Discord:', err));
      }
    }

    // 3. Kirim 1 PESAN RESET DRAW BARU ke Discord
    const resetEmbedPayload = buildRouletteResetEmbed();
    const resDiscord = await discordAPI(
      `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages`,
      'POST',
      resetEmbedPayload
    );

    const newResetMsgId = resDiscord?.id || null;

    // 4. Bersihkan State di KV Redis
    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams: [],
      groupA: [],
      groupB: [],
      selectedTargetGroup: "GROUP_A",
      celebrationWinner: null,
      resetMessageId: newResetMsgId,
      spinEvent: null,
    });

    await kv.del(KV_KEY_LOGS);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
                                                                     }
