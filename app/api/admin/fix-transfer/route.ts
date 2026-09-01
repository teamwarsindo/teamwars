import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { refreshTeamEmbeds } from '@/lib/discord/services/transfer-logger';
import { parsePlayers, PlayerItem, TeamKVData } from '@/lib/discord/services/transfer-types';

export const dynamic = 'force-dynamic';

async function runFixTransfer(req: NextRequest) {
  try {
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    }

    const targetSlug = body.teamSlug || 'licht-united';
    const dazzleUsername = (body.dazzleUsername || 'maxtav9090').toLowerCase().replace(/^@/, '');
    const isekkuuDiscordId = body.isekkuuDiscordId || '1268522970591133769';

    const logs: string[] = [];
    const guildId = DISCORD_CONFIG.GUILD_ID;

    // 1. Ambil hash pemetaan discord ID global
    const verifiedHash = (await kv.hgetall<Record<string, string>>('global:verified_users')) || {};
    const dazzleDiscordId = verifiedHash[dazzleUsername];

    // 2. Ambil data tim target
    const teamKey = `teams:${targetSlug}`;
    const teamData = await kv.hgetall<TeamKVData>(teamKey);

    if (!teamData) {
      return NextResponse.json({ error: `Data tim ${targetSlug} tidak ditemukan di database` }, { status: 404 });
    }

    const tagPrefix = teamData.kodeTim ? `[${teamData.kodeTim}] ` : '';

    // -------------------------------------------------------------
    // 3. PERBAIKI DAZZLE (Cabut Role Tim & Reset Nickname)
    // -------------------------------------------------------------
    if (dazzleDiscordId && guildId) {
      if (teamData.discordRoleId) {
        await discordAPI(
          `/guilds/${guildId}/members/${dazzleDiscordId}/roles/${teamData.discordRoleId}`,
          'DELETE'
        ).catch((err) => logs.push(`⚠️ Gagal mencabut role tim Dazzle: ${err.message || err}`));
        logs.push(`✅ Role tim <@&${teamData.discordRoleId}> berhasil dicabut dari Dazzle (${dazzleDiscordId})`);
      }

      await discordAPI(`/guilds/${guildId}/members/${dazzleDiscordId}`, 'PATCH', { nick: null })
        .then(() => logs.push(`✅ Nickname Discord Dazzle berhasil direset ke default`))
        .catch((err) => logs.push(`⚠️ Gagal mereset nickname Dazzle: ${err.message || err}`));
    } else {
      logs.push(`⚠️ Discord ID untuk username "${dazzleUsername}" tidak ditemukan di global:verified_users.`);
    }

    // Perbaiki data Dazzle di global:free_duelists
    const oldFreeDl = await kv.hget<string>('global:free_duelists_dl', '522-212-537');
    if ((oldFreeDl === dazzleUsername || oldFreeDl === dazzleDiscordId) && dazzleDiscordId) {
      const freeRecordRaw =
        (await kv.hget<string>('global:free_duelists', dazzleDiscordId)) ||
        (await kv.hget<string>('global:free_duelists', dazzleUsername));

      if (freeRecordRaw) {
        const freeRecord = typeof freeRecordRaw === 'string' ? JSON.parse(freeRecordRaw) : freeRecordRaw;
        freeRecord.discordId = dazzleDiscordId;

        await kv.hset('global:free_duelists', { [dazzleDiscordId]: JSON.stringify(freeRecord) });
        await kv.hset('global:free_duelists_ign', { Dazzle: dazzleDiscordId });
        await kv.hset('global:free_duelists_dl', { '522-212-537': dazzleDiscordId });

        if (dazzleUsername !== dazzleDiscordId) {
          await kv.hdel('global:free_duelists', dazzleUsername);
        }
        logs.push(`✅ Entri global:free_duelists Dazzle diperbarui dengan Snowflake ID: ${dazzleDiscordId}`);
      }
    }

    // -------------------------------------------------------------
    // 4. PERBAIKI iSekkuu (Set Nickname & Role Discord)
    // -------------------------------------------------------------
    if (isekkuuDiscordId && guildId) {
      if (teamData.discordRoleId) {
        await discordAPI(
          `/guilds/${guildId}/members/${isekkuuDiscordId}/roles/${teamData.discordRoleId}`,
          'PUT'
        ).catch(() => null);
      }
      if (DISCORD_CONFIG.ROLE_DUELIST) {
        await discordAPI(
          `/guilds/${guildId}/members/${isekkuuDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`,
          'PUT'
        ).catch(() => null);
      }
      if (DISCORD_CONFIG.ROLE_VERIFIED) {
        await discordAPI(
          `/guilds/${guildId}/members/${isekkuuDiscordId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`,
          'PUT'
        ).catch(() => null);
      }

      const targetNick = `${tagPrefix}iSekkuu`;
      await discordAPI(`/guilds/${guildId}/members/${isekkuuDiscordId}`, 'PATCH', { nick: targetNick })
        .then(() => logs.push(`✅ Nickname iSekkuu berhasil diubah menjadi: "${targetNick}"`))
        .catch((err) => logs.push(`⚠️ Gagal mengubah nickname iSekkuu: ${err.message || err}`));
    }

    // -------------------------------------------------------------
    // 5. NORMALISASI DISCORD ID PEMAIN LAMA DI ROSTER KV
    // -------------------------------------------------------------
    const players: PlayerItem[] = parsePlayers(teamData.players);
    let rosterUpdated = false;

    for (const player of players) {
      if (!player.discordId && player.discord) {
        const cleanUser = player.discord.trim().toLowerCase().replace(/^@/, '');
        const resolvedId = verifiedHash[cleanUser];
        if (resolvedId && isValidSnowflake(resolvedId)) {
          player.discordId = resolvedId;
          rosterUpdated = true;
          logs.push(`🔗 Menautkan discordId untuk @${cleanUser}: ${resolvedId}`);
        }
      }
    }

    if (rosterUpdated) {
      await kv.hset(teamKey, {
        players: JSON.stringify(players),
        updatedAt: new Date().toISOString(),
      });
      logs.push(`💾 Data roster tim ${targetSlug} berhasil disinkronkan ke KV.`);
    }

    // -------------------------------------------------------------
    // 6. PAKSA REFRESH EMBED TRACKER CAMP & CH_ROSTER
    // -------------------------------------------------------------
    await refreshTeamEmbeds(targetSlug, teamData, players, Number(teamData.transferQuotaUsed || 0));
    logs.push(`🔄 Pesan Tracker Camp & Rekap CH_ROSTER berhasil di-refresh.`);

    return NextResponse.json({
      success: true,
      team: targetSlug,
      logs,
    });
  } catch (error: any) {
    console.error('Error fix-transfer endpoint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runFixTransfer(req);
}

export async function POST(req: NextRequest) {
  return runFixTransfer(req);
}
