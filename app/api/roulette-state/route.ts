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
  celebrationWinner?: TeamItem | null;
  spinEvent?: {
    winningIndex: number;
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
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const currentState = await kv.get<RouletteState>(KV_KEY_ROULETTE);
    const logs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];

    if (!currentState) {
      return NextResponse.json({
        masterTeams,
        remainingTeams: masterTeams,
        groupA: [],
        groupB: [],
        logs,
        celebrationWinner: null,
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
    const { remainingTeams, groupA, groupB, celebrationWinner, spinEvent, newLog } = body;

    // 1. Simpan State Pengundian ke KV
    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams,
      groupA,
      groupB,
      celebrationWinner: celebrationWinner || null,
      spinEvent: spinEvent || null,
    });

    // 2. Jika ada log tim baru terpilih -> Kirim ke Discord CH_SHUFFLE & Simpan ke KV
    if (newLog) {
      const embedPayload = buildRouletteLogEmbed({
        teamName: newLog.teamName,
        teamLogo: newLog.teamLogo,
        targetGroup: newLog.targetGroup,
        slotNumber: newLog.slotNumber,
      });

      // Kirim pesan ke Channel CH_SHUFFLE via bot
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
    // 1. Ambil seluruh log histori sebelumnya untuk menghapus pesan di Discord
    const existingLogs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];

    // Hapus pesan-pesan log lama di channel CH_SHUFFLE
    for (const log of existingLogs) {
      if (log.discordMessageId) {
        await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/${log.discordMessageId}`,
          'DELETE'
        );
      }
    }

    // 2. Kirim notifikasi ringkas "Reset Draw" ke Discord
    const resetEmbedPayload = buildRouletteResetEmbed();
    await discordAPI(
      `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages`,
      'POST',
      resetEmbedPayload
    );

    // 3. Hapus State KV
    await kv.del(KV_KEY_ROULETTE);
    await kv.del(KV_KEY_LOGS);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
                          }
