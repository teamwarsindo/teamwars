import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { sendTeamTracker } from '@/lib/discord/messages/tracker';
import { parsePlayers, cleanDuelId, PlayerItem } from '@/lib/discord/commands/transfer/types';

export async function GET() {
  try {
    const logs: string[] = [];
    const guildId = DISCORD_CONFIG.GUILD_ID;

    // =========================================================================
    // 1. ROLLBACK [T] sanmao KE TIM TRUE GOD (KV + DISCORD ROLE + NICKNAME)
    // =========================================================================
    const targetSlug = 'true-god';
    const targetIgn = '[T] sanmao';
    const targetDl = '502-433-116';
    const targetDiscordId = '1529447749244682281';

    const trueGodData = await kv.hgetall<any>(`teams:${targetSlug}`);
    if (!trueGodData) {
      return NextResponse.json({ error: `Tim ${targetSlug} tidak ditemukan di KV` }, { status: 404 });
    }

    const trueGodPlayers: PlayerItem[] = parsePlayers(trueGodData.players);
    const existingIndex = trueGodPlayers.findIndex(
      (p) => p.ign.toLowerCase() === targetIgn.toLowerCase()
    );

    // Ambil data Free Agent lama jika ada
    const rawFree = await kv.hget<any>('global:free_duelists', targetDiscordId);
    const freeData = typeof rawFree === 'string' ? JSON.parse(rawFree) : rawFree;
    const discordTag = freeData?.discord || 'sanmao';

    const sanmaoItem: PlayerItem = {
      namaLengkap: freeData?.namaLengkap || targetIgn,
      ign: targetIgn,
      idDuelLinks: targetDl,
      discord: discordTag,
      discordId: targetDiscordId,
      role: 'Anggota',
      teamsJoinedCount: freeData?.teamsJoinedCount || 1,
      isVerified: true,
    };

    if (existingIndex === -1) {
      trueGodPlayers.push(sanmaoItem);
    } else {
      trueGodPlayers[existingIndex] = { ...trueGodPlayers[existingIndex], ...sanmaoItem };
    }

    // Update roster tim TRUE GOD di KV
    await kv.hset(`teams:${targetSlug}`, {
      players: JSON.stringify(trueGodPlayers),
      updatedAt: new Date().toISOString(),
    });

    // Pulihkan index global KV
    const cleanDl = cleanDuelId(targetDl);
    await Promise.all([
      kv.hset('global:duellinks', { [cleanDl]: targetSlug, [targetDl]: targetSlug }),
      kv.hset('global:ign', { [targetIgn]: targetSlug }),
      kv.hset('global:discord_ids', { [targetDiscordId]: targetSlug }),
      discordTag ? kv.hset('global:discord', { [discordTag.toLowerCase()]: targetSlug }) : Promise.resolve(),
      kv.hdel('global:free_duelists', targetDiscordId),
      kv.hdel('global:free_duelists_ign', targetIgn),
      kv.hdel('global:free_duelists_dl', targetDl),
    ]);
    logs.push(`[KV] ${targetIgn} berhasil dimasukkan kembali ke tim ${targetSlug}.`);

    // Kembalikan Role Discord & Nickname server
    if (guildId && targetDiscordId) {
      if (trueGodData.discordRoleId) {
        await discordAPI(
          `/guilds/${guildId}/members/${targetDiscordId}/roles/${trueGodData.discordRoleId}`,
          'PUT',
          {}
        ).catch((err) => console.error('[RESTORE ROLE ERROR]:', err));
        logs.push(`[Discord] Role tim TRUE GOD diberikan kembali ke <@${targetDiscordId}>.`);
      }

      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', {
        nick: targetIgn,
      }).catch((err) => console.error('[RESTORE NICK ERROR]:', err));
      logs.push(`[Discord] Nickname server diset kembali ke "${targetIgn}".`);
    }

    // =========================================================================
    // 2. AMBIL GLOBAL VERIFIED USERS & UPDATE TRACKER SEMUA TIM
    // =========================================================================
    // Ambil data verifikasi global dari KV
    const [verifiedMap, verifiedDlMap] = await Promise.all([
      kv.hgetall<Record<string, any>>('global:verified_users').catch(() => null),
      kv.hgetall<Record<string, any>>('global:duellinks').catch(() => null),
    ]);

    // Ambil semua tim dari channel map
    const channelTeamsMap = await kv.hgetall<Record<string, string>>('global:channel_teams');
    const teamSlugs = Array.from(new Set(Object.values(channelTeamsMap || {})));

    for (const slug of teamSlugs) {
      try {
        const team = await kv.hgetall<any>(`teams:${slug}`);
        if (!team || !team.players) continue;

        // 1. List pemain murni dari KV team
        const players: PlayerItem[] = parsePlayers(team.players);

        // 2. Kuota transfer murni dari KV team (cast ke number agar tidak error kalkulasi)
        const currentQuota = Number(team.transferQuotaUsed ?? 0);

        // 3. Verifikasi dicek langsung ke global verified atau flag bawaan
        const trackerPlayers = players.map((p) => {
          const rawDl = cleanDuelId(p.idDuelLinks || '');
          const cleanPDiscord = (p.discord || '').trim().toLowerCase().replace(/^@/, '');
          const pDiscordId = (p.discordId || '').trim();

          const isVerifiedInGlobal = Boolean(
            p.isVerified ||
            (pDiscordId && verifiedMap && verifiedMap[pDiscordId]) ||
            (cleanPDiscord && verifiedMap && verifiedMap[cleanPDiscord]) ||
            (rawDl && verifiedDlMap && verifiedDlMap[rawDl]) ||
            (p.idDuelLinks && verifiedDlMap && verifiedDlMap[p.idDuelLinks])
          );

          return {
            ign: p.ign,
            discord: p.discord,
            discordId: p.discordId,
            role: p.role,
            isVerified: isVerifiedInGlobal,
          };
        });

        // Update Tracker Discord
        if (team.discordChannelId) {
          const updatedMsgId = await sendTeamTracker({
            channelId: team.discordChannelId,
            namaTim: team.namaTim,
            warna: team.warna,
            roleId: team.discordRoleId,
            players: trackerPlayers,
            createdAt: team.createdAt || '07 Jul 2026',
            updatedAt: new Date().toISOString(),
            transferQuotaUsed: currentQuota,
            trackerMsgId: team.trackerMsgId,
          });

          if (updatedMsgId && updatedMsgId !== team.trackerMsgId) {
            await kv.hset(`teams:${slug}`, { trackerMsgId: updatedMsgId });
          }

          logs.push(`Tracker ${slug} diperbarui (Pemain: ${trackerPlayers.length}, Kuota: ${currentQuota}).`);
        }
      } catch (teamErr: any) {
        logs.push(`Gagal update tim ${slug}: ${teamErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error('[EXECUTE FIX ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
            }
