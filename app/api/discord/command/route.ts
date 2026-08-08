import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';

interface StaffItem {
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

// ==========================================
// 1. REGISTER SLASH COMMANDS (PUT Overwrite)
// ==========================================
export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID;
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  const commands = [
    {
      name: 'assign',
      description: 'Tugaskan Referee atau Streamer ke Pertandingan (Chief/Admin)',
      options: [
        {
          type: 3,
          name: 'match',
          description: 'Pilih pertandingan pada Week Aktif',
          required: true,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'role',
          description: 'Pilih peran panitia',
          required: true,
          choices: [
            { name: 'Referee', value: 'referee' },
            { name: 'Streamer', value: 'streamer' },
          ],
        },
        {
          type: 6,
          name: 'staff',
          description: 'Pilih user Discord staff',
          required: true,
        },
      ],
    },
    {
      name: 'unassign',
      description: 'Cabut/Selesaikan tugas Referee atau Streamer dari Pertandingan',
      options: [
        {
          type: 3,
          name: 'match',
          description: 'Pilih pertandingan pada Week Aktif',
          required: true,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'role',
          description: 'Pilih peran panitia yang dicabut',
          required: true,
          choices: [
            { name: 'Referee', value: 'referee' },
            { name: 'Streamer', value: 'streamer' },
          ],
        },
      ],
    },
  ];

  const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  const data = await res.json();
  return NextResponse.json({ success: true, data });
}

// ==========================================
// 2. DISCORD INTERACTION HANDLER (POST)
// ==========================================
export async function POST(req: Request) {
  const body = await req.json();

  // Handle Autocomplete
  if (body.type === 4) {
    const focusedOption = body.data.options.find((opt: any) => opt.focused);
    if (focusedOption && focusedOption.name === 'match') {
      const schedules = (await kv.get<any[]>('twi:schedules')) || [];
      const choices = schedules
        .filter((m: any) => {
          const title = `${m.groupName || ''} - ${m.teamAName} vs ${m.teamBName}`;
          return title.toLowerCase().includes(focusedOption.value.toLowerCase());
        })
        .slice(0, 25)
        .map((m: any) => ({
          name: `${m.groupName || 'Group'} • ${m.teamAName} vs ${m.teamBName}`,
          value: m.id,
        }));

      return NextResponse.json({
        type: 8,
        data: { choices },
      });
    }
  }

  // Handle Slash Command Execution
  if (body.type === 2) {
    const { name, options } = body.data;
    const optionMap = options.reduce((acc: any, opt: any) => {
      acc[opt.name] = opt.value;
      return acc;
    }, {});

    const matchId = optionMap.match;
    const roleType = optionMap.role; // 'referee' or 'streamer'
    const targetUserId = optionMap.staff; // Untuk /assign

    const schedules = (await kv.get<any[]>('twi:schedules')) || [];
    const matchIdx = schedules.findIndex((m: any) => m.id === matchId);
    if (matchIdx === -1) {
      return responseMessage('❌ Pertandingan tidak ditemukan di database Redis KV.');
    }

    const match = schedules[matchIdx];

    // Ambil data tim A & B dari KV
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

    if (name === 'assign') {
      // 🛡️ GUARD 1: Cek apakah role tersebut sudah terisi di match ini
      if (roleType === 'referee' && match.refereeDiscordId) {
        return responseMessage(`❌ Match ini sudah memiliki Referee (<@${match.refereeDiscordId}>)! Lakukan \`/unassign\` terlebih dahulu.`);
      }
      if (roleType === 'streamer' && match.streamerDiscordId) {
        return responseMessage(`❌ Match ini sudah memiliki Streamer (<@${match.streamerDiscordId}>)! Lakukan \`/unassign\` terlebih dahulu.`);
      }

      // 🛡️ GUARD 2: Cek apakah staff sedang sibuk (aktif di match lain)
      const staffKey = roleType === 'streamer' ? 'staff:streamers' : 'staff:referees';
      const staffList = (await kv.get<StaffItem[]>(staffKey)) || [];
      const staffObj = staffList.find((s) => s.discordId === targetUserId);
      const staffName = staffObj?.discordName || `<@${targetUserId}>`;

      if (staffObj && staffObj.assignMatch && staffObj.assignMatch.length > 0) {
        return responseMessage(`❌ Staff <@${targetUserId}> sedang bertugas aktif di match lain! Selesaikan tugasnya terlebih dahulu.`);
      }

      // Berikan akses Discord (Role / Permission)
      if (guildId && isValidSnowflake(targetUserId)) {
        if (roleType === 'referee') {
          if (isValidSnowflake(roleAId)) await discordAPI(`/guilds/${guildId}/members/${targetUserId}/roles/${roleAId}`, 'PUT').catch(() => null);
          if (isValidSnowflake(roleBId)) await discordAPI(`/guilds/${guildId}/members/${targetUserId}/roles/${roleBId}`, 'PUT').catch(() => null);
        } else if (match.discordChannelId) {
          await discordAPI(`/channels/${match.discordChannelId}/permissions/${targetUserId}`, 'PUT', {
            type: 1,
            allow: '66560',
            deny: '0',
          }).catch(() => null);
        }
      }

      // Update data di objek match
      if (roleType === 'referee') {
        match.referee = staffName;
        match.refereeDiscordId = targetUserId;
      } else {
        match.streamer = match.caster = staffName;
        match.streamerDiscordId = match.casterDiscordId = targetUserId;
      }

      // Masukkan ke assignMatch (status sibuk) staff
      const staffIdx = staffList.findIndex((s) => s.discordId === targetUserId);
      if (staffIdx !== -1) {
        staffList[staffIdx].assignMatch = Array.from(new Set([...(staffList[staffIdx].assignMatch || []), match.id]));
      } else {
        staffList.push({ discordId: targetUserId, discordName: staffName, assignMatch: [match.id], historyMatch: [] });
      }
      await kv.set(staffKey, staffList);

      // Simpan perubahan match sementara ke Redis
      schedules[matchIdx] = match;
      await kv.set('twi:schedules', schedules);

      // 📺 HAPUS & POST ULANG OPENING EMBED DI CHANNEL MATCH (TANPA MENTION TIM)
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

      // 📋 KIRIM LOG PENUGASAN KE `#CH_ASSIGN` (REPLY JIKA ADA LOG SEBELUMNYA)
      const chAssign = DISCORD_CONFIG.CH_ASSIGN;
      const prevLogId = roleType === 'referee' ? match.refereeLogMsgId : match.streamerLogMsgId;

      if (chAssign) {
        const t1 = `${teamAEmoji ? teamAEmoji + ' ' : ''}**${match.teamAName}**`;
        const t2 = `${teamBEmoji ? teamBEmoji + ' ' : ''}**${match.teamBName}**`;
        const logPayload: any = {
          content: `${roleType === 'referee' ? '⚖️' : '🎥'} <@${targetUserId}> ditugaskan sebagai **${roleType === 'referee' ? 'Referee' : 'Streamer'}**!`,
          embeds: [
            {
              title: roleType === 'referee' ? '⚖️ Referee Assignment' : '🎥 Streamer Assignment',
              description: `${match.groupName || 'Group A'} • ${calculatedWeek}\n${t1} vs ${t2}`,
              color: roleType === 'referee' ? 0x3498db : 0xe74c3c,
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
          if (roleType === 'referee') match.refereeLogMsgId = logRes.id;
          else match.streamerLogMsgId = logRes.id;
        }
      }

      schedules[matchIdx] = match;
      await kv.set('twi:schedules', schedules);

      return responseMessage(`✅ Berhasil menugaskan <@${targetUserId}> sebagai ${roleType.toUpperCase()}!`);
    }

    if (name === 'unassign') {
      const staffDiscordId = roleType === 'referee' ? match.refereeDiscordId : (match.streamerDiscordId || match.casterDiscordId);
      if (!staffDiscordId) {
        return responseMessage(`❌ Match ini belum memiliki ${roleType.toUpperCase()} yang terdaftar.`);
      }

      // Cabut akses Discord staff
      if (guildId && isValidSnowflake(staffDiscordId)) {
        if (roleType === 'referee') {
          if (isValidSnowflake(roleAId)) await discordAPI(`/guilds/${guildId}/members/${staffDiscordId}/roles/${roleAId}`, 'DELETE').catch(() => null);
          if (isValidSnowflake(roleBId)) await discordAPI(`/guilds/${guildId}/members/${staffDiscordId}/roles/${roleBId}`, 'DELETE').catch(() => null);
        } else if (match.discordChannelId) {
          await discordAPI(`/channels/${match.discordChannelId}/permissions/${staffDiscordId}`, 'DELETE').catch(() => null);
        }
      }

      // Pindahkan status sibuk (assignMatch) ke history permanen (historyMatch) staff
      const staffKey = roleType === 'streamer' ? 'staff:streamers' : 'staff:referees';
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

      // 🔴 KHUSUS REFEREE: SELESAIKAN MATCH & KIRIM SKOR KE `#CH_SCORE`
      if (roleType === 'referee') {
        match.isCompleted = true;

        const chScore = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_LOG;
        if (chScore) {
          const sA = match.scoreA ?? 0;
          const sB = match.scoreB ?? 0;
          const emojiA = teamAEmoji ? teamAEmoji + ' ' : '';
          const emojiB = teamBEmoji ? teamBEmoji + ' ' : '';

          let scoreSummary = '';
          let winColor = 0x2ecc71; // Hijau default

          // Warna embed score mengikuti warna role tim yang menang
          if (sA > sB) {
            scoreSummary = `${emojiA}**${match.teamAName}** defeated ${emojiB}**${match.teamBName}** with a score of **${sA}-${sB}**`;
            winColor = 0x3498db; 
          } else if (sB > sA) {
            scoreSummary = `${emojiB}**${match.teamBName}** defeated ${emojiA}**${match.teamAName}** with a score of **${sB}-${sA}**`;
            winColor = 0xe74c3c;
          } else {
            scoreSummary = `${emojiA}**${match.teamAName}** tied with ${emojiB}**${match.teamBName}** with a score of **${sA}-${sB}**`;
            winColor = 0xf1c40f; // Kuning jika seri
          }

          const scorePayload = {
            embeds: [{ description: scoreSummary, color: winColor }],
          };
          await discordAPI(`/channels/${chScore}/messages`, 'POST', scorePayload).catch(() => null);
        }

        // Cabut hak akses role Team A & Team B dari channel pertandingan
        if (guildId && match.discordChannelId) {
          if (isValidSnowflake(roleAId)) {
            await discordAPI(`/channels/${match.discordChannelId}/permissions/${roleAId}`, 'DELETE').catch(() => null);
          }
          if (isValidSnowflake(roleBId)) {
            await discordAPI(`/channels/${match.discordChannelId}/permissions/${roleBId}`, 'DELETE').catch(() => null);
          }
        }
      }

      // 📺 EMBED OPENING DI CHANNEL MATCH DIAM / TIDAK DISENTUH SAMA SEKALI

      // 📋 KIRIM LOG SELESAI TUGAS KE `#CH_ASSIGN` (REPLY KE LOG AWAL)
      const chAssign = DISCORD_CONFIG.CH_ASSIGN;
      const targetLogId = roleType === 'referee' ? match.refereeLogMsgId : match.streamerLogMsgId;

      if (chAssign && targetLogId) {
        const t1 = `${teamAEmoji ? teamAEmoji + ' ' : ''}**${match.teamAName}**`;
        const t2 = `${teamBEmoji ? teamBEmoji + ' ' : ''}**${match.teamBName}**`;
        const roleTitle = roleType === 'referee' ? 'Referee' : 'Streamer';

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

      schedules[matchIdx] = match;
      await kv.set('twi:schedules', schedules);

      return responseMessage(`✅ Berhasil menyelesaikan tugas ${roleType.toUpperCase()} untuk match ini.`);
    }
  }

  return NextResponse.json({ error: 'Invalid interaction' }, { status: 400 });
}

function responseMessage(content: string) {
  return NextResponse.json({
    type: 4,
    data: { content, flags: 64 },
  });
                    }
