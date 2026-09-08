import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { sendTeamTracker } from '@/lib/discord/messages/tracker';
import { parsePlayers, cleanDuelId, PlayerItem } from '@/lib/discord/commands/transfer/types';

export async function GET() {
  try {
    const logs: string[] = [];

    // ==========================================
    // 1. ROLLBACK [T] sanmao KE TIM TRUE GOD
    // ==========================================
    const targetSlug = 'true-god';
    const targetIgn = '[T] sanmao';
    const targetDl = '502-433-116';
    const targetDiscordId = '1529447749244682281';

    const trueGodData = await kv.hgetall<any>(`teams:${targetSlug}`);
    if (trueGodData) {
      const players: PlayerItem[] = parsePlayers(trueGodData.players);
      const exists = players.some((p) => p.ign.toLowerCase() === targetIgn.toLowerCase());

      if (!exists) {
        const freeData = await kv.hget<any>('global:free_duelists', targetDiscordId);
        const parsedFree = typeof freeData === 'string' ? JSON.parse(freeData) : freeData;

        players.push({
          ign: targetIgn,
          idDuelLinks: targetDl,
          discord: parsedFree?.discord || 'sanmao',
          discordId: targetDiscordId,
          role: 'Anggota',
          teamsJoinedCount: parsedFree?.teamsJoinedCount || 1,
        });

        // Pulihkan indeks global KV
        const cleanDl = cleanDuelId(targetDl);
        await Promise.all([
          kv.hset('global:duellinks', { [cleanDl]: targetSlug, [targetDl]: targetSlug }),
          kv.hset('global:ign', { [targetIgn]: targetSlug }),
          kv.hset('global:discord_ids', { [targetDiscordId]: targetSlug }),
          parsedFree?.discord
            ? kv.hset('global:discord', { [parsedFree.discord.toLowerCase()]: targetSlug })
            : Promise.resolve(),
        ]);

        // Hapus dari pool Free Agent
        await Promise.all([
          kv.hdel('global:free_duelists', targetDiscordId),
          kv.hdel('global:free_duelists_ign', targetIgn),
          kv.hdel('global:free_duelists_dl', targetDl),
        ]);

        logs.push(`[T] sanmao berhasil dikembalikan ke ${targetSlug}`);
      }

      await kv.hset(`teams:${targetSlug}`, {
        players: JSON.stringify(players),
        updatedAt: new Date().toISOString(),
      });
      trueGodData.players = players;
    }

    // ==========================================
    // 2. NORMALISASI KUOTA & UPDATE TRACKER SEMUA TIM
    // ==========================================
    const channelTeamsMap = await kv.hgetall<Record<string, string>>('global:channel_teams');
    const teamSlugs = Array.from(new Set(Object.values(channelTeamsMap || {})));

    for (const slug of teamSlugs) {
      try {
        const team = await kv.hgetall<any>(`teams:${slug}`);
        if (!team || !team.players) continue;

        const players: PlayerItem[] = parsePlayers(team.players);

        // Perbaiki bug string konkatenasi (misal '011' dinormalkan ke integer valid)
        let quota = team.transferQuotaUsed;
        let numericQuota = parseInt(String(quota ?? '0'), 10);

        if (isNaN(numericQuota) || numericQuota > 2) {
          numericQuota = 1;
        }

        if (String(team.transferQuotaUsed) !== String(numericQuota)) {
          await kv.hset(`teams:${slug}`, { transferQuotaUsed: numericQuota });
        }

        // Mapping ke struktur tracker dengan helper icon resmi
        const trackerPlayers = players.map((p) => ({
          ign: p.ign,
          discord: p.discord,
          discordId: p.discordId,
          role: p.role,
          isVerified: Boolean(p.discordId && p.discordId.trim().length > 10),
        }));

        if (team.discordChannelId) {
          const updatedMsgId = await sendTeamTracker({
            channelId: team.discordChannelId,
            namaTim: team.namaTim,
            warna: team.warna,
            roleId: team.discordRoleId,
            players: trackerPlayers,
            createdAt: team.createdAt || '07 Jul 2026',
            updatedAt: new Date().toISOString(),
            transferQuotaUsed: numericQuota,
            trackerMsgId: team.trackerMsgId,
          });

          if (updatedMsgId && updatedMsgId !== team.trackerMsgId) {
            await kv.hset(`teams:${slug}`, { trackerMsgId: updatedMsgId });
          }

          logs.push(`Tracker berhasil diupdate: ${slug} (Kuota: ${numericQuota})`);
        }
      } catch (teamErr: any) {
        logs.push(`Error tim ${slug}: ${teamErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error('[FIX ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
    }
