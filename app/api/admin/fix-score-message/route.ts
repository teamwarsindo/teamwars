import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { parsePlayers, cleanDuelId, PlayerItem } from '@/lib/discord/commands/transfer/types';

function buildTeamTrackerEmbed(teamData: any, players: PlayerItem[], currentQuota: number) {
  const verifiedCount = players.length;
  const totalPlayers = players.length;
  const maxQuota = 2;
  const remainingQuota = Math.max(0, maxQuota - currentQuota);

  const rosterLines = players.map((p) => {
    let badge = '';
    if (p.role === 'Ketua') badge = ' 👑';
    else if (p.role === 'Wakil Ketua' || p.role === 'Wakil') badge = ' 🥇';
    return `✅ **${p.ign}** (\`@${p.discord || '-'}\`)${badge}`;
  }).join('\n');

  const nowWib = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date()).replace(/\./g, ':') + ' WIB';

  return {
    title: teamData.namaTim,
    color: parseInt((teamData.warna || '#5865F2').replace('#', ''), 16),
    description:
      `**DAFTAR ROSTER:**\n${rosterLines}\n\n` +
      `*Keterangan:* 👑 *Ketua* / 🥇 *Wakil*\n\n` +
      `📌 **Role Tim**\n${teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : '-'}\n\n` +
      `📊 **Status Verifikasi**\n${verifiedCount} / ${totalPlayers} Terverifikasi\n\n` +
      `🔄 **Kuota Transfer**\n${currentQuota} / ${maxQuota} Terpakai *(Sisa: ${remainingQuota})*`,
    footer: {
      text: `Registered: ${teamData.createdAt || '07 Jul 2026'}\nLast Updated: ${nowWib}`,
    },
  };
}

export async function GET() {
  try {
    const targetDiscordId = '1529447749244682281';
    const targetIgn = '[T] sanmao';
    const targetDl = '502-433-116';
    const logs: string[] = [];

    // 1. CARI DATA FREE AGENT UNTUK DAPAT TIM ASALNYA
    let freeData: any = null;
    const rawById = await kv.hget<any>('global:free_duelists', targetDiscordId);
    if (rawById) {
      freeData = typeof rawById === 'string' ? JSON.parse(rawById) : rawById;
    } else {
      const freeKey = await kv.hget<string>('global:free_duelists_ign', targetIgn);
      if (freeKey) {
        const rawByKey = await kv.hget<any>('global:free_duelists', freeKey);
        freeData = typeof rawByKey === 'string' ? JSON.parse(rawByKey) : rawByKey;
      }
    }

    const teamSlug = freeData?.lastTeam;
    if (!teamSlug) {
      return NextResponse.json({
        error: 'Data Free Agent tidak ditemukan untuk sanmao. Pastikan slug tim asal diketahui.',
      }, { status: 404 });
    }

    logs.push(`Tim asal sanmao ditemukan: ${teamSlug}`);

    // 2. KEMBALIKAN KE TIM ASALNYA
    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (teamData) {
      const players: PlayerItem[] = parsePlayers(teamData.players);
      const exists = players.some((p) => p.ign.toLowerCase() === targetIgn.toLowerCase());

      if (!exists) {
        players.push({
          ign: targetIgn,
          idDuelLinks: targetDl,
          discord: freeData?.discord || '',
          discordId: targetDiscordId,
          role: 'Anggota',
          teamsJoinedCount: freeData?.teamsJoinedCount || 1,
        });

        // Pulihkan index KV
        const cleanDl = cleanDuelId(targetDl);
        await Promise.all([
          kv.hset('global:duellinks', { [cleanDl]: teamSlug, [targetDl]: teamSlug }),
          kv.hset('global:ign', { [targetIgn]: teamSlug }),
          kv.hset('global:discord_ids', { [targetDiscordId]: teamSlug }),
          freeData?.discord ? kv.hset('global:discord', { [freeData.discord.toLowerCase()]: teamSlug }) : Promise.resolve(),
        ]);

        // Hapus dari pool Free Agent
        await Promise.all([
          kv.hdel('global:free_duelists', targetDiscordId),
          kv.hdel('global:free_duelists_ign', targetIgn),
          kv.hdel('global:free_duelists_dl', targetDl),
        ]);

        logs.push(`[T] sanmao berhasil dikembalikan ke roster ${teamSlug}.`);
      }

      await kv.hset(`teams:${teamSlug}`, {
        players: JSON.stringify(players),
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. NORMALISASI KUOTA & UPDATE TRACKER SEMUA TIM
    const channelTeamsMap = await kv.hgetall<Record<string, string>>('global:channel_teams');
    const teamSlugs = Array.from(new Set(Object.values(channelTeamsMap || {})));

    for (const slug of teamSlugs) {
      try {
        const tData = await kv.hgetall<any>(`teams:${slug}`);
        if (!tData || !tData.players) continue;

        const pList: PlayerItem[] = parsePlayers(tData.players);

        // Perbaiki bug kuota string seperti '011'
        let parsedQuota = parseInt(String(tData.transferQuotaUsed || '0'), 10);
        if (isNaN(parsedQuota) || parsedQuota > 5) {
          parsedQuota = 0;
          await kv.hset(`teams:${slug}`, { transferQuotaUsed: 0 });
        }

        const channelId = tData.discordChannelId;
        const trackerMsgId = tData.trackerMsgId;

        if (channelId && trackerMsgId) {
          const embed = buildTeamTrackerEmbed(tData, pList, parsedQuota);
          await discordAPI(`/channels/${channelId}/messages/${trackerMsgId}`, 'PATCH', {
            embeds: [embed],
          });
          logs.push(`Tracker tim ${slug} berhasil diperbarui.`);
        }
      } catch (err: any) {
        logs.push(`Gagal update tracker ${slug}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      teamRestored: teamSlug,
      logs,
    });
  } catch (err: any) {
    console.error('[FIX SANMAO ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
