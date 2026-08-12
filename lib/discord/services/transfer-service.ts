import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake, hexToDecimal } from '@/lib/discord/utils';

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

/**
 * Format ID Duel Links / Master Duel menjadi 9 digit dengan strip (XXX-XXX-XXX)
 */
export function formatDuelId(input: string): string {
  if (!input) return '-';
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
 * Smart Extractor Teks Request Transfer (Aman Multi-Line & Single-Line)
 */
export function parseTransferSmartText(rawText: string): {
  action: 'ADD' | 'OUT' | 'EDIT';
  ign: string | null;
  idDl: string | null;
} {
  const textLower = rawText.toLowerCase();

  // 1. Deteksi Aksi
  let action: 'ADD' | 'OUT' | 'EDIT' = 'ADD';
  if (textLower.includes('req out') || textLower.includes('mengeluarkan')) {
    action = 'OUT';
  } else if (textLower.includes('ganti') || textLower.includes('edit')) {
    action = 'EDIT';
  }

  // 2. Extract ID Game (Mencari 9 digit angka paling akhir)
  const idMatches = rawText.match(/(\d{3}[-\s]?\d{3}[-\s]?\d{3}|\d{9})/g);
  let idDl: string | null = null;
  if (idMatches && idMatches.length > 0) {
    idDl = idMatches[idMatches.length - 1].replace(/\D/g, '');
  }

  // 3. Extract IGN (String setelah 'IGN :' dan dipotong jika ada keyword 'ID' / 'Discord')
  let ign: string | null = null;
  const ignMatch = rawText.match(/IGN\s*:\s*([^\n\r\t]+)/i);
  if (ignMatch) {
    let extracted = ignMatch[1].trim();
    const cutoffIndex = extracted.search(/\b(ID|ID DL|MD|MD lama|MD baru|Discord)\b/i);
    if (cutoffIndex !== -1) {
      extracted = extracted.substring(0, cutoffIndex).trim();
    }
    ign = extracted || null;
  }

  return { action, ign, idDl };
}

/**
 * Send Log Berita Transfer Simpel (Tanpa Title & Footer)
 */
export async function sendTransferNewsLog(params: {
  teamHex: string;
  messageText: string;
}) {
  if (!DISCORD_CONFIG.CH_LOG_TRANSFER) return;

  const payload = {
    embeds: [
      {
        description: params.messageText,
        color: hexToDecimal(params.teamHex || '#3498db'),
      },
    ],
  };

  await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG_TRANSFER}/messages`, 'POST', payload).catch(() => null);
}

/**
 * Helper Refresh Embed CH_ROSTER dan Match Camp Tracker (Sync dengan global:verified_users)
 */
export async function refreshTeamEmbeds(
  teamSlug: string,
  teamData: TeamKVData,
  players: PlayerItem[],
  quotaUsedOverride?: number
) {
  const createdAt = teamData.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const ketua = players.find((p) => p.role === 'Ketua') || { ign: '-' };
  const wakil = players.find((p) => p.role === 'Wakil Ketua') || { ign: '-' };

  const getFooterString = () =>
    `Registered: ${new Date(createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date(
      createdAt
    ).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\nLast Updated: ${new Date(
      updatedAt
    ).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date(
      updatedAt
    ).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  // 1. Update Embed CH_ROSTER
  if (teamData.adminMsgId && DISCORD_CONFIG.CH_ROSTER) {
    const playerListString = players.map((p) => `${p.ign} (${p.idDuelLinks})`).join('\n');
    const rosterPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          color: hexToDecimal(teamData.warna || '#3498db'),
          thumbnail: teamData.logoTim ? { url: teamData.logoTim } : undefined,
          fields: [
            { name: 'Ketua', value: ketua.ign, inline: true },
            { name: 'Wakil', value: wakil.ign, inline: true },
            { name: 'Players', value: playerListString, inline: false },
          ],
          footer: {
            text: getFooterString(),
          },
        },
      ],
    };
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${teamData.adminMsgId}`, 'PATCH', rosterPayload).catch(() => null);
  }

  // 2. Update Embed Match Camp Tracker
  if (teamData.trackerMsgId && teamData.discordChannelId) {
    // 🔍 READ DATA DARI HASH global:verified_users
    const verifiedHash = (await kv.hgetall<Record<string, string>>('global:verified_users')) || {};
    
    const verifiedUsernames = new Set(Object.keys(verifiedHash).map((k) => k.toLowerCase()));
    const verifiedIds = new Set(Object.values(verifiedHash));

    let verifiedCount = 0;
    let rosterText = '';

    players.forEach((p) => {
      const pDiscordClean = p.discord ? p.discord.toLowerCase() : '';
      
      const isVerified =
        (pDiscordClean && verifiedUsernames.has(pDiscordClean)) ||
        (p.discordId && verifiedIds.has(p.discordId));

      if (isVerified) {
        verifiedCount++;
        rosterText += `✅ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      } else {
        rosterText += `❌ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      }
    });

    const currentQuotaUsed = quotaUsedOverride !== undefined ? quotaUsedOverride : (teamData.transferQuotaUsed || 0);

    const trackerPayload = {
      embeds: [
        {
          title: teamData.namaTim,
          description: `**DAFTAR ROSTER:**\n${rosterText}`,
          color: hexToDecimal(teamData.warna || '#3498db'),
          fields: [
            { name: '📌 Role Tim', value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: '📊 Status', value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true },
            { name: '🔄 Kuota Transfer', value: `**${currentQuotaUsed} / 2** Terpakai`, inline: false },
          ],
          footer: {
            text: getFooterString(),
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

  if (removedPlayer.role === 'Ketua') {
    throw new Error('Gagal Transfer! Ketua Tim tidak dapat dikeluarkan. Ubah/serahkan jabatan Ketua terlebih dahulu!');
  }
  if (removedPlayer.role === 'Wakil Ketua') {
    throw new Error(
      `Gagal Transfer! **${removedPlayer.ign}** saat ini menjabat sebagai **Wakil Ketua**. Pindahkan jabatan Wakil Ketua ke anggota lain terlebih dahulu via \`/transfer edit\` sebelum mengeluarkan pemain ini!`
    );
  }

  players.splice(targetIdx, 1);

  await Promise.all([
    kv.hdel('global:ign', removedPlayer.ign.toLowerCase()),
    kv.hdel('global:duellinks', removedPlayer.idDuelLinks),
    kv.hdel('global:discord', removedPlayer.discord.toLowerCase()),
    removedPlayer.discordId ? kv.hdel('global:discord_ids', removedPlayer.discordId) : Promise.resolve(),
  ]);

  // Simpan data ke Pool Free Agent / Free Duelist
  const freeDuelistKey = `global:free_duelists:${removedPlayer.discord.toLowerCase()}`;
  const existingFreeDuelist = await kv.hgetall<any>(freeDuelistKey);
  const currentJoinedCount = existingFreeDuelist?.teamsJoinedCount || 1;

  await kv.hset(freeDuelistKey, {
    ign: removedPlayer.ign,
    idDuelLinks: removedPlayer.idDuelLinks,
    discord: removedPlayer.discord,
    discordId: removedPlayer.discordId || '',
    teamsJoinedCount: currentJoinedCount,
    lastTeam: teamSlug,
    releasedAt: new Date().toISOString(),
  });

  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && removedPlayer.discordId && teamData.discordRoleId) {
    // Cabut Role Tim (Role Duelist & Verified TETAP ADA)
    await discordAPI(`/guilds/${guildId}/members/${removedPlayer.discordId}/roles/${teamData.discordRoleId}`, 'DELETE').catch(() => null);
  }

  await kv.hset(key, { players: JSON.stringify(players) });
  await refreshTeamEmbeds(teamSlug, teamData, players);

  // Log Berita OUT
  const logMsg = `**${removedPlayer.ign}** (**${removedPlayer.idDuelLinks}**) telah dikeluarkan dari roster tim 🛡️ **${teamData.namaTim}**`;
  await sendTransferNewsLog({ teamHex: teamData.warna, messageText: logMsg });

  return { teamName: teamData.namaTim, removedIgn: removedPlayer.ign };
}

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
    throw new Error('Gagal Transfer! ID Game / Duel Links harus terdiri dari 9 digit angka.');
  }

  // FREE AGENT BEBAS -> KUOTA TIM TETAP LAMA
  const currentQuota = teamData.transferQuotaUsed || 0;

  // Cek Duplikasi Global
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
    throw new Error(`Gagal Transfer! ID Game **${formattedDl}** sudah terdaftar di tim **${t?.data.namaTim || existingDlTeam}**.`);
  }

  if (existingDiscordTeam) {
    const t = await getTeamBySlug(existingDiscordTeam);
    throw new Error(`Gagal Transfer! Akun Discord **${targetUsername}** sudah terdaftar di tim **${t?.data.namaTim || existingDiscordTeam}**.`);
  }

  const newPlayer: PlayerItem = {
    role: 'Anggota',
    namaLengkap: cleanIgn,
    discord: targetUsername,
    discordId: targetDiscordId,
    ign: cleanIgn,
    idDuelLinks: formattedDl,
  };

  players.push(newPlayer);

  // 🟢 SIMPAN RAPPING KV + OTOMATIS DAFTARKAN KE HASH global:verified_users
  await Promise.all([
    kv.hset('global:ign', { [cleanIgn.toLowerCase()]: teamSlug }),
    kv.hset('global:duellinks', { [formattedDl]: teamSlug }),
    kv.hset('global:discord', { [targetUsername.toLowerCase()]: teamSlug }),
    kv.hset('global:discord_ids', { [targetDiscordId]: teamSlug }),
    kv.hset('global:verified_users', { [targetUsername.toLowerCase()]: targetDiscordId }),
  ]);

  const guildId = DISCORD_CONFIG.GUILD_ID;
  if (guildId && isValidSnowflake(targetDiscordId)) {
    // A. Role Tim
    if (teamData.discordRoleId) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${teamData.discordRoleId}`, 'PUT').catch(() => null);
    }
    // B. Role Duelist
    if (DISCORD_CONFIG.ROLE_DUELIST) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
    }
    // C. Role Verified (OTOMATIS BERI ROLE VERIFIED)
    if (DISCORD_CONFIG.ROLE_VERIFIED) {
      await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => null);
    }
    // D. Update Server Nickname
    await discordAPI(`/guilds/${guildId}/members/${targetDiscordId}`, 'PATCH', { nick: cleanIgn }).catch(() => null);
  }

  await kv.hset(key, { players: JSON.stringify(players), transferQuotaUsed: currentQuota });
  
  // Refresh Tracker Roster
  await refreshTeamEmbeds(teamSlug, teamData, players, currentQuota);

  // Log Berita ADD
  const logMsg = `**${cleanIgn}** (**${formattedDl}**) telah ditambahkan ke roster tim 🛡️ **${teamData.namaTim}**`;
  await sendTransferNewsLog({ teamHex: teamData.warna, messageText: logMsg });

  return { teamName: teamData.namaTim, addedIgn: cleanIgn, currentQuota };
}

export async function executeTransferEditDl(teamSlug: string, targetUsername: string, rawNewIdDl: string) {
  const res = await getTeamBySlug(teamSlug);
  if (!res) throw new Error('Tim tidak ditemukan!');

  const { key, data: teamData } = res;
  const players = parsePlayers(teamData.players);

  let currentQuota = teamData.transferQuotaUsed || 0;
  if (currentQuota >= 2) {
    throw new Error('Gagal Edit ID! Kuota transfer/perubahan tim kamu sudah habis (Maksimal 2x per musim).');
  }

  const formattedDl = formatDuelId(rawNewIdDl);
  if (formattedDl.replace(/\D/g, '').length !== 9) {
    throw new Error('Gagal Transfer! ID Game harus terdiri dari 9 digit angka.');
  }

  const player = players.find(
    (p) => p.discord.toLowerCase() === targetUsername.toLowerCase() || p.ign.toLowerCase() === targetUsername.toLowerCase()
  );
  if (!player) throw new Error('Pemain tidak ditemukan di roster tim ini!');

  const oldDl = player.idDuelLinks;

  const existingDlTeam = await kv.hget<string>('global:duellinks', formattedDl);
  if (existingDlTeam && existingDlTeam !== teamSlug) {
    const t = await getTeamBySlug(existingDlTeam);
    throw new Error(`Gagal Transfer! ID Game **${formattedDl}** sudah terdaftar atas nama **${player.ign}** di tim **${t?.data.namaTim || existingDlTeam}**.`);
  }

  if (player.idDuelLinks) await kv.hdel('global:duellinks', player.idDuelLinks);
  player.idDuelLinks = formattedDl;
  await kv.hset('global:duellinks', { [formattedDl]: teamSlug });

  // EDIT ID MEMAKAN KUOTA (+1)
  currentQuota += 1;

  await kv.hset(key, { players: JSON.stringify(players), transferQuotaUsed: currentQuota });
  await refreshTeamEmbeds(teamSlug, teamData, players, currentQuota);

  // Log Berita EDIT ID
  const logMsg = `**${player.ign}** dari tim 🛡️ **${teamData.namaTim}** telah mengganti ID Game dari ${oldDl} menjadi **${formattedDl}**`;
  await sendTransferNewsLog({ teamHex: teamData.warna, messageText: logMsg });

  return { teamName: teamData.namaTim, ign: player.ign, newDl: formattedDl, currentQuota };
}

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

  const oldLeader = players.find((p) => p.role === newRole);
  if (oldLeader) oldLeader.role = 'Anggota';

  players[targetIdx].role = newRole;

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

  // Log Berita SET LEADER
  const logMsg = `Tim 🛡️ **${teamData.namaTim}** telah mengganti jabatan **${newRole}** ke **${newLeaderPlayer.ign}**`;
  await sendTransferNewsLog({ teamHex: teamData.warna, messageText: logMsg });

  return { teamName: teamData.namaTim, ign: newLeaderPlayer.ign, newRole };
    }
