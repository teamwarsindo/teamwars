import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake, hexToDecimal, getFooterText } from '@/lib/discord/utils';

export interface PlayerItem {
  role: 'Ketua' | 'Wakil Ketua' | 'Anggota';
  namaLengkap: string;
  discord: string;
  discordId?: string;
  ign: string;
  idDuelLinks: string;
}

export interface TeamKVData {
  [key: string]: any;
  namaTim: string;
  warna: string;
  logoTim?: string;
  createdAt?: string;
  discordRoleId?: string;
  discordChannelId?: string;
  trackerMsgId?: string;
  adminMsgId?: string;
  transferQuotaUsed?: number;
  players: string | PlayerItem[];
}

export function formatDuelId(input: string): string {
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 9) return input.trim();
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`;
}

export async function getTeamBySlug(slug: string): Promise<{ key: string; data: TeamKVData } | null> {
  const key = `teams:${slug}`;
  const data = await kv.hgetall<TeamKVData>(key);
  if (!data || !data.namaTim) return null;
  return { key, data };
}

export function parsePlayers(playersData: string | PlayerItem[]): PlayerItem[] {
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

/**
 * Send Log Berita Transfer Simpel (Tanpa Icon/Emoji, Pake Embed)
 */
export async function sendTransferNewsLog(params: {
  teamName: string;
  teamHex: string;
  messageText: string;
  createdAt?: string;
}) {
  if (!DISCORD_CONFIG.CH_LOG_TRANSFER) return;

  const payload = {
    embeds: [
      {
        title: 'TRANSFER ROSTER',
        description: params.messageText,
        color: hexToDecimal(params.teamHex),
        footer: {
          text: getFooterText(params.createdAt, new Date().toISOString()),
        },
      },
    ],
  };

  await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG_TRANSFER}/messages`, 'POST', payload).catch(() => null);
}

/**
 * Helper Refresh Embed CH_ROSTER dan Match Camp Tracker
 */
export async function refreshTeamEmbeds(teamSlug: string, teamData: TeamKVData, players: PlayerItem[]) {
  const createdAt = teamData.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const ketua = players.find((p) => p.role === 'Ketua') || { ign: '-' };
  const wakil = players.find((p) => p.role === 'Wakil Ketua') || { ign: '-' };

  // 1. Update/PATCH Embed CH_ROSTER
  if (teamData.adminMsgId && DISCORD_CONFIG.CH_ROSTER) {
    const playerListString = players.map((p) => `${p.ign} (${p.idDuelLinks})`).join('\n');
    const rosterPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          color: hexToDecimal(teamData.warna),
          thumbnail: teamData.logoTim ? { url: teamData.logoTim } : undefined,
          fields: [
            { name: 'Ketua', value: ketua.ign, inline: true },
            { name: 'Wakil', value: wakil.ign, inline: true },
            { name: 'Players', value: playerListString, inline: false },
          ],
          footer: {
            text: getFooterText(createdAt, updatedAt),
          },
        },
      ],
    };
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${teamData.adminMsgId}`, 'PATCH', rosterPayload).catch(() => null);
  }

  // 2. Update/PATCH Embed Match Camp Tracker
  if (teamData.trackerMsgId && teamData.discordChannelId) {
    let rosterText = '';
    players.forEach((p) => {
      rosterText += `❌ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
    });

    const quotaUsed = teamData.transferQuotaUsed || 0;

    const trackerPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          description: `**DAFTAR ROSTER:**\n${rosterText}`,
          color: hexToDecimal(teamData.warna),
          fields: [
            { name: '📌 Role Tim', value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: '📊 Status', value: `**0 / ${players.length}** Terverifikasi`, inline: true },
            { name: '🔄 Kuota Transfer', value: `**${quotaUsed} / 2** Terpakai`, inline: false },
          ],
          footer: {
            text: getFooterText(createdAt, updatedAt),
          },
        },
      ],
    };
    await discordAPI(`/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, 'PATCH', trackerPayload).catch(() => null);
  }
}

// ----------------------------------------------------
// CORE TRANSFER ACTIONS
// ----------------------------------------------------

/**
 * 1. TRANSFER OUT (Keluarkan Pemain)
 */
export async function executeTransferOut(teamSlug: string, targetDiscordUsername: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length <= 5) {
    throw new Error('Gagal Transfer! Roster tim tidak boleh kurang dari 5 pemain.');
  }

  const targetIdx = players.findIndex(
    (p) => p.discord.toLowerCase() === targetDiscordUsername.toLowerCase() || p.ign.toLowerCase() === targetDiscordUsername.toLowerCase()
  );
  if (targetIdx === -1) {
    throw new Error('Pemain tidak ditemukan di roster tim ini!');
  }

  const removedPlayer = players[targetIdx];

  // Proteksi Ketua & Wakil
  if (removedPlayer.role === 'Ketua') {
    throw new Error('Gagal Transfer! Ketua Tim tidak dapat dikeluarkan. Ubah/serahkan jabatan Ketua terlebih dahulu!');
  }
  if (removedPlayer.role === 'Wakil Ketua') {
    throw new Error(
      `Gagal Transfer! **${removedPlayer.ign}** saat ini menjabat sebagai **Wakil Ketua**. Pindahkan jabatan Wakil Ketua ke anggota lain terlebih dahulu via \`/transfer edit\` sebelum mengeluarkan pemain ini!`
    );
  }

  // Hapus dari roster
  players.splice(targetIdx, 1);

  // Update KV Global Hashes (Hapus pemetaan aktif)
  await Promise.all([
    kv.hdel('global:ign', removedPlayer.ign.toLowerCase()),
    kv.hdel('global:duellinks', removedPlayer.idDuelLinks),
    kv.hdel('global:discord', removedPlayer.discord.toLowerCase()),
    removedPlayer.discordId ? kv.hdel('global:discord_ids', removedPlayer.discordId) : Promise.resolve(),
  ]);

  // Cek counter bergabung Free Duelist
  const freeDuelistKey = `global:free_duelists:${removedPlayer.discord.toLowerCase()}`;
  const existingFreeDuelist = await kv.hgetall<any>(freeDuelistKey);
  const currentJoinedCount = existingFreeDuelist?.teamsJoinedCount || 1;

  // Simpan ke Free Duelists Global Pool
  await kv.hset(freeDuelistKey, {
    ign: removedPlayer.ign,
    idDuelLinks: removedPlayer.idDuelLinks,
    discord: removedPlayer.discord,
    discordId: removedPlayer.discordId || '',
    teamsJoinedCount: currentJoinedCount,
    lastTeam: teamSlug,
    releasedAt: new Date().toISOString(),
  });

  // Cabut Role Tim dari Discord (Role Duelist Tetap Ada)
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && removedPlayer.discordId && teamData.discordRoleId) {
    await discordAPI(`/guilds/${guildId}/members/${removedPlayer.discordId}/roles/${teamData.discordRoleId}`, 'DELETE').catch(() => null);
  }

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players) });
  await refreshTeamEmbeds(teamSlug, teamData, players);

  // Log Berita
  const logMsg = `${removedPlayer.ign} (${removedPlayer.idDuelLinks}) telah dikeluarkan dari roster tim ${teamData.namaTim}`;
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, messageText: logMsg, createdAt: teamData.createdAt });

  return { teamName: teamData.namaTim, removedIgn: removedPlayer.ign };
}

/**
 * 2. TRANSFER ADD (Masukkan Pemain Baru)
 */
export async function executeTransferAdd(params: {
  teamSlug: string;
  targetDiscordId: string;
  targetUsername: string;
  ign: string;
  rawIdDl: string;
}) {
  const { teamSlug, targetDiscordId, targetUsername, ign, rawIdDl } = params;

  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  if (players.length >= 10) {
    throw new Error('Gagal Transfer! Roster tim sudah mencapai batas maksimal 10 pemain.');
  }

  const cleanIgn = ign.trim();
  const formattedDl = formatDuelId(rawIdDl);

  if (formattedDl.replace(/\D/g, '').length !== 9) {
    throw new Error('Gagal Transfer! ID Duel Links harus terdiri dari 9 digit angka.');
  }

  // Cek Status Free Duelist
  const freeDuelistKey = `global:free_duelists:${targetUsername.toLowerCase()}`;
  const freeDuelist = await kv.hgetall<any>(freeDuelistKey);

  let currentQuota = teamData.transferQuotaUsed || 0;

  if (freeDuelist && freeDuelist.ign) {
    const joinedCount = freeDuelist.teamsJoinedCount || 1;
    if (joinedCount >= 2) {
      throw new Error(`Gagal Transfer! Pemain **${targetUsername}** sudah mencapai batas maksimal 2x membela tim.`);
    }

    if (currentQuota >= 2) {
      throw new Error('Gagal Transfer! Tim kamu sudah menghabiskan kuota maksimal (2x) transfer/perubahan roster.');
    }

    currentQuota += 1;
    await kv.hset(freeDuelistKey, { teamsJoinedCount: joinedCount + 1 });
  }

  // Pengecekan Duplikasi Global
  const [existingIgnTeam, existingDlTeam, existingDiscordTeam] = await Promise.all([
    kv.hget<string>('global:ign', cleanIgn.toLowerCase()),
    kv.hget<string>('global:duellinks', formattedDl),
    kv.hget<string>('global:discord', targetUsername.toLowerCase()),
  ]);

  if (existingIgnTeam) {
    const t = await getTeamBySlug(existingIgnTeam);
    throw new Error(`Gagal Transfer! IGN **${cleanIgn}** sudah terdaftar di tim **${t?.data.namaTim || existingIgnTeam}**.`);
  }

  if (existingDlTeam) {
    const t = await getTeamBySlug(existingDlTeam);
    throw new Error(`Gagal Transfer! ID Duel Links **${formattedDl}** sudah terdaftar di tim **${t?.data.namaTim || existingDlTeam}**.`);
  }

  if (existingDiscordTeam) {
    const t = await getTeamBySlug(existingDiscordTeam);
    throw new Error(`Gagal Transfer! Akun Discord **${targetUsername}** sudah terdaftar di tim **${t?.data.namaTim || existingDiscordTeam}**.`);
  }

  // Buat Objek Player Baru
  const newPlayer: PlayerItem = {
    role: 'Anggota',
    namaLengkap: cleanIgn,
    discord: targetUsername,
    discordId: targetDiscordId,
    ign: cleanIgn,
    idDuelLinks: formattedDl,
  };

  players.push(newPlayer);

  // Update Global Hashes
  await Promise.all([
    kv.hset('global:ign', { [cleanIgn.toLowerCase()]: teamSlug }),
    kv.hset('global:duellinks', { [formattedDl]: teamSlug }),
    kv.hset('global:discord', { [targetUsername.toLowerCase()]: teamSlug }),
    kv.hset('global:discord_ids', { [targetDiscordId]: teamSlug }),
  ]);

  // Aksi Discord API
  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && isValidSnowflake(targetDiscordId)) {
    if (teamData.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
    }
    if (DISCORD_CONFIG.ROLE_DUELIST) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
    }
    await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: cleanIgn }).catch(() => null);
  }

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players), transferQuotaUsed: currentQuota });
  await refreshTeamEmbeds(teamSlug, teamData, players);

  // Log Berita
  const logMsg = `${cleanIgn} (${formattedDl}) telah ditambahkan ke roster tim ${teamData.namaTim}`;
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, messageText: logMsg, createdAt: teamData.createdAt });

  return { teamName: teamData.namaTim, addedIgn: cleanIgn, currentQuota };
}

/**
 * 3. TRANSFER EDIT DL
 */
export async function executeTransferEditDl(teamSlug: string, targetUsername: string, rawNewIdDl: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  let currentQuota = teamData.transferQuotaUsed || 0;
  if (currentQuota >= 2) {
    throw new Error('Gagal Edit ID DL! Kuota transfer/perubahan tim kamu sudah habis (Maksimal 2x per musim).');
  }

  const formattedDl = formatDuelId(rawNewIdDl);
  if (formattedDl.replace(/\D/g, '').length !== 9) {
    throw new Error('Gagal Transfer! ID Duel Links harus terdiri dari 9 digit angka.');
  }

  const player = players.find(
    (p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase()
  );
  if (!player) throw new Error('Pemain tidak ditemukan di roster tim ini!');

  const oldDl = player.idDuelLinks;

  // Cek duplikasi ID DL baru
  const existingDlTeam = await kv.hget<string>('global:duellinks', formattedDl);
  if (existingDlTeam && existingDlTeam !== teamSlug) {
    const t = await getTeamBySlug(existingDlTeam);
    throw new Error(`Gagal Transfer! ID Duel Links **${formattedDl}** sudah terdaftar atas nama **${player.ign}** di tim **${t?.data.namaTim || existingDlTeam}**.`);
  }

  // Hapus ID lama, daftarkan ID baru ke Global
  if (player.idDuelLinks) await kv.hdel('global:duellinks', player.idDuelLinks);
  player.idDuelLinks = formattedDl;
  await kv.hset('global:duellinks', { [formattedDl]: teamSlug });

  currentQuota += 1;

  // Simpan KV Tim & Refresh Embed
  await kv.hset(key, { players: JSON.stringify(players), transferQuotaUsed: currentQuota });
  await refreshTeamEmbeds(teamSlug, teamData, players);

  // Log Berita
  const logMsg = `${player.ign} dari tim ${teamData.namaTim} telah mengganti ID Duel Links dari ${oldDl} menjadi ${formattedDl}`;
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, messageText: logMsg, createdAt: teamData.createdAt });

  return { teamName: teamData.namaTim, ign: player.ign, newDl: formattedDl, currentQuota };
}

/**
 * 4. TRANSFER SET LEADER / WAKIL
 */
export async function executeTransferSetLeader(
  teamSlug: string,
  targetUsername: string,
  newRole: 'Ketua' | 'Wakil Ketua',
  isExecutedByAdmin: boolean
) {
  if (newRole === 'Ketua' && !isExecutedByAdmin) {
    throw new Error('❌ Khusus **Admin** yang dapat mengubah posisi Ketua!');
  }

  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  const targetIdx = players.findIndex(
    (p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase()
  );
  if (targetIdx === -1) throw new Error('Pemain tidak ditemukan di roster tim ini!');

  // Demutasi pejabat lama ke Anggota
  const oldLeader = players.find((p) => p.role === newRole);
  if (oldLeader) oldLeader.role = 'Anggota';

  // Promosi ke Ketua/Wakil baru
  players[targetIdx].role = newRole;

  // Re-order Array Players: Ketua (0), Wakil (1), Anggota (sisanya)
  const ketuaPlayer = players.find((p) => p.role === 'Ketua');
  const wakilPlayer = players.find((p) => p.role === 'Wakil Ketua');
  const anggotaPlayers = players.filter((p) => p.role === 'Anggota');

  const orderedPlayers: PlayerItem[] = [];
  if (ketuaPlayer) orderedPlayers.push(ketuaPlayer);
  if (wakilPlayer) orderedPlayers.push(wakilPlayer);
  orderedPlayers.push(...anggotaPlayers);

  const guildId = DISCORD_CONFIG.GUILD_ID;
  const newLeaderPlayer = players[targetIdx];

  if (guildId) {
    const targetRoleDiscordId = newRole === 'Ketua' ? DISCORD_CONFIG.ROLE_KETUA : DISCORD_CONFIG.ROLE_WAKIL;

    if (oldLeader?.discordId && targetRoleDiscordId) {
      await discordAPI(`/guilds/${guildId}/members/${oldLeader.discordId}/roles/${targetRoleDiscordId}`, 'DELETE').catch(() => null);
    }
    if (newLeaderPlayer.discordId && targetRoleDiscordId) {
      await discordAPI(`/guilds/${guildId}/members/${newLeaderPlayer.discordId}/roles/${targetRoleDiscordId}`, 'PUT').catch(() => null);
    }
  }

  await kv.hset(key, { players: JSON.stringify(orderedPlayers) });
  await refreshTeamEmbeds(teamSlug, teamData, orderedPlayers);

  // Log Berita
  const logMsg = `Tim ${teamData.namaTim} telah mengganti jabatan ${newRole} ke ${newLeaderPlayer.ign}`;
  await sendTransferNewsLog({ teamName: teamData.namaTim, teamHex: teamData.warna, messageText: logMsg, createdAt: teamData.createdAt });

  return { teamName: teamData.namaTim, ign: newLeaderPlayer.ign, newRole };
}