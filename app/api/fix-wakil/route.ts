import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import {
  getTeamBySlug,
  parsePlayers,
  resolveDiscordId,
} from '@/lib/discord/commands/transfer/types';
import { refreshTeamEmbeds } from '@/lib/discord/commands/transfer/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Parameter ?slug= wajib diisi' }, { status: 400 });
    }

    const teamRes = await getTeamBySlug(slug);
    if (!teamRes) {
      return NextResponse.json({ error: `Tim '${slug}' tidak ditemukan` }, { status: 404 });
    }

    const teamData = teamRes.data;
    const players = parsePlayers(teamData.players);
    const guildId = DISCORD_CONFIG.GUILD_ID;
    const roleWakilId = DISCORD_CONFIG.ROLE_WAKIL;

    if (!guildId || !roleWakilId) {
      return NextResponse.json({ error: 'GUILD_ID atau ROLE_WAKIL belum dikonfigurasi di ENV' }, { status: 500 });
    }

    // 1. Deteksi siapa Wakil resmi menurut database
    const officialWakil = players.find((p) => p.role === 'Wakil Ketua');
    if (!officialWakil) {
      return NextResponse.json(
        { error: 'Tidak ada pemain dengan jabatan "Wakil Ketua" di roster database tim ini' },
        { status: 400 }
      );
    }

    const correctDiscordId = await resolveDiscordId(officialWakil.discord, officialWakil.discordId);
    if (!correctDiscordId) {
      return NextResponse.json(
        { error: `Gagal menemukan Discord ID untuk Wakil resmi: ${officialWakil.ign} (@${officialWakil.discord})` },
        { status: 400 }
      );
    }

    // 2. Deteksi anggota tim yang saat ini memegang ROLE_WAKIL di Discord
    const removedRoles: string[] = [];
    const addedRoles: string[] = [];

    for (const p of players) {
      const pDiscordId = await resolveDiscordId(p.discord, p.discordId);
      if (!pDiscordId) continue;

      // Ambil data member dari Discord API
      const member = await discordAPI(`/guilds/${guildId}/members/${pDiscordId}`, 'GET');
      if (!member || !member.roles) continue;

      const hasWakilRole = member.roles.includes(roleWakilId);

      // Jika memegang role tapi bukan Wakil resmi di DB -> Cabut
      if (hasWakilRole && pDiscordId !== correctDiscordId) {
        await discordAPI(`/guilds/${guildId}/members/${pDiscordId}/roles/${roleWakilId}`, 'DELETE');
        removedRoles.push(`${p.ign} (<@${pDiscordId}>)`);
      }

      // Jika dia Wakil resmi tapi belum memegang role -> Pasang
      if (!hasWakilRole && pDiscordId === correctDiscordId) {
        await discordAPI(`/guilds/${guildId}/members/${correctDiscordId}/roles/${roleWakilId}`, 'PUT');
        addedRoles.push(`${officialWakil.ign} (<@${correctDiscordId}>)`);
      }
    }

    // Pastikan akun Wakil resmi memegang role jika tadi belum ada di perulangan
    if (addedRoles.length === 0) {
      const checkOfficial = await discordAPI(`/guilds/${guildId}/members/${correctDiscordId}`, 'GET');
      if (checkOfficial && checkOfficial.roles && !checkOfficial.roles.includes(roleWakilId)) {
        await discordAPI(`/guilds/${guildId}/members/${correctDiscordId}/roles/${roleWakilId}`, 'PUT');
        addedRoles.push(`${officialWakil.ign} (<@${correctDiscordId}>)`);
      }
    }

    // 3. Rollback Kuota Transfer (kurangi 1)
    const currentQuota = Number(teamData.transferQuotaUsed || 0);
    const newQuota = Math.max(0, currentQuota - 1);

    const nowIso = new Date().toISOString();
    await kv.hset(`teams:${slug}`, {
      transferQuotaUsed: newQuota,
      updatedAt: nowIso,
    });
    teamData.transferQuotaUsed = newQuota;
    teamData.updatedAt = nowIso;

    // 4. Sinkronisasi Live Embeds (Camp Tracker & Admin Roster)
    await refreshTeamEmbeds(slug, teamData, players, newQuota);

    return NextResponse.json({
      success: true,
      team: teamData.namaTim,
      officialWakil: `${officialWakil.ign} (<@${correctDiscordId}>)`,
      quotaRollback: {
        before: currentQuota,
        after: newQuota,
      },
      roleAudit: {
        removedFrom: removedRoles.length > 0 ? removedRoles : 'Tidak ada (sudah bersih)',
        assignedTo: addedRoles.length > 0 ? addedRoles : 'Sudah memiliki role sebelumnya',
      },
      embedsRefreshed: true,
    });
  } catch (err: any) {
    console.error('Error fixing wakil role/quota:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
                                }
