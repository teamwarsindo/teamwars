import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
  historyMatch?: string[];
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function resolveTeamEmoji(teamData: any): string | undefined {
  if (!teamData) return undefined;
  const directTag = teamData.discordEmoji || teamData.emojiTag || teamData.emoji;
  if (typeof directTag === 'string' && directTag.startsWith('<:') && directTag.endsWith('>')) {
    return directTag;
  }
  const emojiId = teamData.discordEmojiId || teamData.emojiId;
  if (emojiId) {
    const rawCode = teamData.kodeTim || teamData.abbreviation || teamData.tag || 'team';
    const cleanName = rawCode.replace(/\s+/g, '');
    return `<:${cleanName}:${emojiId}>`;
  }
  return undefined;
}

function formatWIBDate(dateIso?: string): string {
  if (!dateIso) return 'Belum tersedia';
  const d = new Date(dateIso);
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' at ' +
    d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
      .replace('.', ':') +
    ' WIB'
  );
}

export async function executeAssignStaff(params: {
  matchId: string;
  assignType: 'referee' | 'streamer';
  targetStaffId: string;
}) {
  const { matchId, assignType, targetStaffId } = params;

  const schedules = (await kv.get<any[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Pertandingan tidak ditemukan di Redis KV.');

  const match = schedules[idx];

  // 🛡️ GUARD 1: Cek apakah role sudah terisi di match
  if (assignType === 'referee' && match.refereeDiscordId) {
    throw new Error(`Match ini sudah memiliki Referee (<@${match.refereeDiscordId}>)! Lakukan /unassign terlebih dahulu.`);
  }
  if (assignType === 'streamer' && match.streamerDiscordId) {
    throw new Error(`Match ini sudah memiliki Streamer (<@${match.streamerDiscordId}>)! Lakukan /unassign terlebih dahulu.`);
  }

  // 🛡️ GUARD 2: Cek apakah staff sedang sibuk di match lain
  const staffKey = assignType === 'streamer' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(staffKey)) || [];
  const staffObj = staffList.find((s) => s.discordId === targetStaffId);
  const staffName = staffObj?.discordName || `<@${targetStaffId}>`;

  if (staffObj && staffObj.assignMatch && staffObj.assignMatch.length > 0) {
    throw new Error(`Staff <@${targetStaffId}> sedang bertugas aktif di match lain! Selesaikan tugasnya terlebih dahulu.`);
  }

  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);
  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
    kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
  ]);

  const roleAId = teamA?.discordRoleId || teamA?.roleId || '';
  const roleBId = teamB?.discordRoleId || teamB?.roleId || '';
  const teamAEmoji = resolveTeamEmoji(teamA);
  const teamBEmoji = resolveTeamEmoji(teamB);
  const calculatedWeek = match.weekName || `Week ${match.calculatedWeekNumber || 1}`;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  // Berikan akses Discord
  if (guildId && isValidSnowflake(targetStaffId)) {
    if (assignType === 'referee') {
      if (isValidSnowflake(roleAId)) await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleAId}`, 'PUT').catch(() => null);
      if (isValidSnowflake(roleBId)) await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleBId}`, 'PUT').catch(() => null);
    } else if (match.discordChannelId) {
      await discordAPI(`/channels/${match.discordChannelId}/permissions/${targetStaffId}`, 'PUT', {
        type: 1,
        allow: '66560',
        deny: '0',
      }).catch(() => null);
    }
  }

  if (assignType === 'referee') {
    match.referee = staffName;
    match.refereeDiscordId = targetStaffId;
  } else {
    match.streamer = match.caster = staffName;
    match.streamerDiscordId = match.casterDiscordId = targetStaffId;
  }

  // Update assignMatch staff (status sibuk)
  const staffIdx = staffList.findIndex((s) => s.discordId === targetStaffId);
  if (staffIdx !== -1) {
    staffList[staffIdx].assignMatch = Array.from(new Set([...(staffList[staffIdx].assignMatch || []), match.id]));
  } else {
    staffList.push({ discordId: targetStaffId, discordName: staffName, assignMatch: [match.id], historyMatch: [] });
  }
  await kv.set(staffKey, staffList);

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  // 📺 OPENING EMBED: DELETE & POST BARU (TANPA MENTION TIM KARENA INI UPDATE STAFF)
  if (match.discordChannelId) {
    if (match.openingMsgId) {
      await discordAPI(`/channels/${match.discordChannelId}/messages/${match.openingMsgId}`, 'DELETE').catch(() => null);
    }

    const roleAStr = roleAId ? `<@&${roleAId}>` : `**${match.teamAName}**`;
    const roleBStr = roleBId ? `<@&${roleBId}>` : `**${match.teamBName}**`;
    const teamADisp = `${teamAEmoji ? teamAEmoji + ' ' : ''}${roleAStr}`;
    const teamBDisp = `${teamBEmoji ? teamBEmoji + ' ' : ''}${roleBStr}`;

    const openingPayload = {
      content: '', // Kosong tanpa tag tim saat update staff
      embeds: [
        {
          title: '⚔️ Pertandingan Dimulai!',
          description: `**${match.groupName || 'Group Stage'}** • **${calculatedWeek}**\n\n${teamADisp} **VS** ${teamBDisp}`,
          color: 0xf1c40f,
          fields: [
            { name: '⚖️ Referee', value: match.refereeDiscordId ? `<@${match.refereeDiscordId}>` : 'Belum tersedia', inline: true },
            { name: '🎥 Streamer', value: match.streamerDiscordId ? `<@${match.streamerDiscordId}>` : 'Belum tersedia', inline: true },
            { name: '📅 Waktu Match', value: formatWIBDate(match.matchDate), inline: false },
            ...(match.streamLink ? [{ name: '📺 Link Streaming', value: match.streamLink, inline: false }] : []),
          ],
          footer: { text: `Match ID: ${match.id} • Team Wars Indonesia Season 7` },
        },
      ],
    };

    const newOpenRes = await discordAPI(`/channels/${match.discordChannelId}/messages`, 'POST', openingPayload).catch(() => null);
    if (newOpenRes?.id) {
      match.openingMsgId = newOpenRes.id;
    }
  }

  // 📋 LOG PENUGASAN KE `#CH_ASSIGN` (REPLY KE LOG LAMA JIKA ADA)
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  const prevLogId = assignType === 'referee' ? match.refereeLogMsgId : match.streamerLogMsgId;

  if (chAssign) {
    const t1 = `${teamAEmoji ? teamAEmoji + ' ' : ''}**${match.teamAName}**`;
    const t2 = `${teamBEmoji ? teamBEmoji + ' ' : ''}**${match.teamBName}**`;
    const logPayload: any = {
      content: `${assignType === 'referee' ? '⚖️' : '🎥'} <@${targetStaffId}> ditugaskan sebagai **${assignType === 'referee' ? 'Referee' : 'Streamer'}**!`,
      embeds: [
        {
          title: assignType === 'referee' ? '⚖️ Referee Assignment' : '🎥 Streamer Assignment',
          description: `${match.groupName || 'Group A'} • ${calculatedWeek}\n${t1} vs ${t2}`,
          color: assignType === 'referee' ? 0x3498db : 0xe74c3c,
          fields: [
            { name: '📅 Waktu Pertandingan', value: formatWIBDate(match.matchDate), inline: false },
            { name: '📌 Match Channel', value: match.discordChannelId ? `<#${match.discordChannelId}>` : '`Channel Belum Ada`', inline: false },
          ],
          footer: { text: 'Team Wars Indonesia Season 7' },
        },
      ],
    };

    if (prevLogId) {
      logPayload.message_reference = { message_id: prevLogId };
    }

    const logRes = await discordAPI(`/channels/${chAssign}/messages`, 'POST', logPayload).catch(() => null);
    if (logRes?.id) {
      if (assignType === 'referee') match.refereeLogMsgId = logRes.id;
      else match.streamerLogMsgId = logRes.id;
    }
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, staffName };
}

export async function executeUnassignStaff(params: {
  matchId: string;
  assignType: 'referee' | 'streamer';
}) {
  const { matchId, assignType } = params;

  const schedules = (await kv.get<any[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Pertandingan tidak ditemukan di Redis KV.');

  const match = schedules[idx];
  const staffDiscordId = assignType === 'referee' ? match.refereeDiscordId : (match.streamerDiscordId || match.casterDiscordId);

  if (!staffDiscordId) {
    throw new Error(`Match ini belum memiliki ${assignType.toUpperCase()} yang terdaftar.`);
  }

  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);
  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
    kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
  ]);

  const roleAId = teamA?.discordRoleId || teamA?.roleId || '';
  const roleBId = teamB?.discordRoleId || teamB?.roleId || '';
  const teamAEmoji = resolveTeamEmoji(teamA);
  const teamBEmoji = resolveTeamEmoji(teamB);
  const calculatedWeek = match.weekName || `Week ${match.calculatedWeekNumber || 1}`;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  // Cabut akses Discord staff
  if (guildId && isValidSnowflake(staffDiscordId)) {
    if (assignType === 'referee') {
      if (isValidSnowflake(roleAId)) await discordAPI(`/guilds/${guildId}/members/${staffDiscordId}/roles/${roleAId}`, 'DELETE').catch(() => null);
      if (isValidSnowflake(roleBId)) await discordAPI(`/guilds/${guildId}/members/${staffDiscordId}/roles/${roleBId}`, 'DELETE').catch(() => null);
    } else if (match.discordChannelId) {
      await discordAPI(`/channels/${match.discordChannelId}/permissions/${staffDiscordId}`, 'DELETE').catch(() => null);
    }
  }

  // Pindahkan dari assignMatch ke historyMatch permanen (untuk hitung jam terbang/lokasi)
  const staffKey = assignType === 'streamer' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(staffKey)) || [];
  const staffIdx = staffList.findIndex((s) => s.discordId === staffDiscordId);
  if (staffIdx !== -1) {
    const active = new Set(staffList[staffIdx].assignMatch || []);
    active.delete(match.id);
    staffList[staffIdx].assignMatch = Array.from(active);

    const history = new Set(staffList[staffIdx].historyMatch || []);
    history.add(match.id);
    staffList[staffIdx].historyMatch = Array.from(history);

    await kv.set(staffKey, staffList);
  }

  // 🔴 KHUSUS REFEREE: SELESAIKAN MATCH, KIRIM SKOR (WARNA MENGIKUTI TIM MENANG), & CABUT AKSES CHAT TIM
  if (assignType === 'referee') {
    match.isCompleted = true;

    const chScore = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_LOG;
    if (chScore) {
      const sA = match.scoreA ?? 0;
      const sB = match.scoreB ?? 0;
      const emojiA = teamAEmoji ? teamAEmoji + ' ' : '';
      const emojiB = teamBEmoji ? teamBEmoji + ' ' : '';

      let scoreSummary = '';
      let winColor = 0x2ecc71;

      if (sA > sB) {
        scoreSummary = `${emojiA}**${match.teamAName}** defeated ${emojiB}**${match.teamBName}** with a score of **${sA}-${sB}**`;
        winColor = 0x3498db;
      } else if (sB > sA) {
        scoreSummary = `${emojiB}**${match.teamBName}** defeated ${emojiA}**${match.teamAName}** with a score of **${sB}-${sA}**`;
        winColor = 0xe74c3c;
      } else {
        scoreSummary = `${emojiA}**${match.teamAName}** tied with ${emojiB}**${match.teamBName}** with a score of **${sA}-${sB}**`;
        winColor = 0xf1c40f;
      }

      const scorePayload = {
        embeds: [{ description: scoreSummary, color: winColor }],
      };
      await discordAPI(`/channels/${chScore}/messages`, 'POST', scorePayload).catch(() => null);
    }

    if (guildId && match.discordChannelId) {
      if (isValidSnowflake(roleAId)) await discordAPI(`/channels/${match.discordChannelId}/permissions/${roleAId}`, 'DELETE').catch(() => null);
      if (isValidSnowflake(roleBId)) await discordAPI(`/channels/${match.discordChannelId}/permissions/${roleBId}`, 'DELETE').catch(() => null);
    }
  }

  // 📺 OPENING EMBED DI CHANNEL MATCH DIBIARKAN UTUH (TIDAK DISENTUH/DIUBAH)

  // 📋 KIRIM LOG SELESAI TUGAS KE `#CH_ASSIGN` (REPLY KE LOG AWAL)
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  const targetLogId = assignType === 'referee' ? match.refereeLogMsgId : match.streamerLogMsgId;

  if (chAssign && targetLogId) {
    const t1 = `${teamAEmoji ? teamAEmoji + ' ' : ''}**${match.teamAName}**`;
    const t2 = `${teamBEmoji ? teamBEmoji + ' ' : ''}**${match.teamBName}**`;
    const roleTitle = assignType === 'referee' ? 'Referee' : 'Streamer';

    const completePayload = {
      content: `Terimakasih <@${staffDiscordId}> telah bertugas sebagai ${roleTitle}!`,
      message_reference: { message_id: targetLogId },
      embeds: [
        {
          title: `✅ ${roleTitle} Assignment - COMPLETED`,
          description: `${match.groupName || 'Group A'} • ${calculatedWeek}\n${t1} vs ${t2}`,
          color: 0x2ecc71,
          fields: [{ name: '📅 Waktu Pertandingan', value: formatWIBDate(match.matchDate), inline: false }],
          footer: { text: 'Team Wars Indonesia Season 7' },
        },
      ],
    };
    await discordAPI(`/channels/${chAssign}/messages`, 'POST', completePayload).catch(() => null);
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, staffDiscordId };
      }
              
