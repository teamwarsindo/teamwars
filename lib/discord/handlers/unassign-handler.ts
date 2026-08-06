import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return isAdmin || (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) || (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF));
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function handleUnassignCommand(interaction: any) {
  if (!isAuth(interaction)) return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value; // 'REFEREE' | 'STREAMER'
  const reason = opts.find((o: any) => o.name === 'reason')?.value; // 'COMPLETED' | 'REPLACED'

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) return { type: 4, data: { content: '❌ Match tidak ditemukan!', flags: 64 } };

  const match = schedules[idx];
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const channelId = (match as any).discordChannelId;
  const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

  // 1. CABUT ROLE / PERMISSION DI DISCORD SERVER
  if (assignType === 'REFEREE' && match.refereeDiscordId && guildId) {
    const refereeId = match.refereeDiscordId;
    // Cari Role Tim A & Tim B
    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamAName)}`),
      kv.hgetall<any>(`teams:${getTeamSlug(match.teamBName)}`),
    ]);

    if (teamA?.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${refereeId}/roles/${teamA.discordRoleId}`, 'DELETE').catch(() => null);
    }
    if (teamB?.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${refereeId}/roles/${teamB.discordRoleId}`, 'DELETE').catch(() => null);
    }
  } else if (assignType === 'STREAMER' && match.streamerDiscordId && channelId) {
    // Hapus permission overwrite streamer dari channel privat match
    await discordAPI(`/channels/${channelId}/permissions/${match.streamerDiscordId}`, 'DELETE').catch(() => null);
  }

  // 2. PATCH EMBED LOG DI CHANNEL #CH_ASSIGN
  const logMsgId = assignType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;
  const assignChannelId = DISCORD_CONFIG.CH_ASSIGN;

  if (logMsgId && assignChannelId) {
    const nowUnix = Math.floor(Date.now() / 1000);
    const statusText = reason === 'COMPLETED' 
      ? `✅ **Tugas Selesai / Match Usai** pada <t:${nowUnix}:R>` 
      : `🔄 **Penugasan Dibatalkan / Ganti Staf** pada <t:${nowUnix}:R>`;

    const patchedEmbed = {
      title: reason === 'COMPLETED' 
        ? `⚖️ LOG PENUGASAN ${roleTitle.toUpperCase()} [✅ SELESAI]` 
        : `~~⚖️ LOG PENUGASAN ${roleTitle.toUpperCase()}~~ [⛔ DICABUT/DIGANTI]`,
      color: reason === 'COMPLETED' ? 0x10b981 : 0x6b7280, // Hijau jika selesai, Abu-abu jika diganti
      fields: [
        {
          name: '📌 Pertandingan',
          value: `**${match.id.toUpperCase()}** • ${match.teamAName} vs ${match.teamBName}`,
          inline: false,
        },
        {
          name: '👤 Staf Sebelumnya',
          value: assignType === 'REFEREE' ? (match.referee || '`N/A`') : (match.streamer || '`N/A`'),
          inline: true,
        },
        {
          name: '🏷️ Status Akhir',
          value: statusText,
          inline: false,
        },
      ],
      footer: { text: `Team Wars Indonesia • Audit Log Updated` },
      timestamp: new Date().toISOString(),
    };

    await discordAPI(`/channels/${assignChannelId}/messages/${logMsgId}`, 'PATCH', { embeds: [patchedEmbed] }).catch(() => null);
  }

  // 3. KOSONGKAN RECORD DATA DI REDIS JIKALAU BUKAN MATCH SELESAI (JIKA SELESAI RETAIN MEREKA)
  if (assignType === 'REFEREE') {
    delete match.referee;
    delete match.refereeDiscordId;
    delete (match as any).refereeLogMsgId;
  } else {
    delete match.streamer;
    delete match.caster;
    delete match.streamerDiscordId;
    delete match.casterDiscordId;
    delete (match as any).streamerLogMsgId;
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  // 4. TRIGGER SYNC MATCH UNTUK UPDATE EMBED DI CHANNEL PRIVAT MATCH
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
  fetch(`${origin}/api/tournament/sync-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: match.id }),
  }).catch(() => null);

  const reasonLabel = reason === 'COMPLETED' ? 'Match Selesai' : 'Ganti Staff';
  return {
    type: 4,
    data: {
      content: `🗑️ Penugasan **${roleTitle}** di match **${match.id}** berhasil dicabut (${reasonLabel}). Role & Permission Discord telah dibersihkan!`,
      flags: 64,
    },
  };
  }
