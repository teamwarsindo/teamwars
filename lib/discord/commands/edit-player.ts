import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';
import { validateIGN, validateDiscord, validateDuelId, sanitizeIGN, sanitizeDiscord, formatDuelId } from '@/lib/validators';

export async function handleEditPlayer(body: any) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const memberRoles = body.member?.roles || [];
  
  // 1. CEK OTORISASI
  const hasAccess = memberRoles.includes(DISCORD_CONFIG.ROLE_ADMIN) || memberRoles.includes(DISCORD_CONFIG.ROLE_REFEREE);
  if (!hasAccess) {
    return NextResponse.json({ type: 4, data: { content: '⛔ Akses Ditolak! Hanya Admin/Wasit yang bisa edit roster.', flags: 64 } });
  }

  // 2. TANGKAP INPUT (OPTIONS)
  const options = body.data.options || [];
  const targetUserOpt = options.find((o: any) => o.name === 'user');
  const ignOpt = options.find((o: any) => o.name === 'ign');
  const discordOpt = options.find((o: any) => o.name === 'discord');
  const duelIdOpt = options.find((o: any) => o.name === 'duel_id');

  const targetUserId = targetUserOpt.value;
  // Ambil data user dari resolved payload discord
  const resolvedUser = body.data.resolved?.users?.[targetUserId];
  const targetUsername = resolvedUser?.username.toLowerCase() || '';

  // 3. JALANKAN VALIDASI JIKA ADA INPUT
  let newIgn = ignOpt ? sanitizeIGN(ignOpt.value) : undefined;
  let newDiscord = discordOpt ? sanitizeDiscord(discordOpt.value) : undefined;
  let newDuelId = duelIdOpt ? formatDuelId(duelIdOpt.value) : undefined;

  const errors = [];
  if (newIgn) {
    const err = validateIGN(newIgn);
    if (err) errors.push(`IGN: ${err}`);
  }
  if (newDiscord) {
    const err = validateDiscord(newDiscord);
    if (err) errors.push(`Discord: ${err}`);
  }
  if (newDuelId) {
    const err = validateDuelId(newDuelId);
    if (err) errors.push(`Duel ID: ${err}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ type: 4, data: { content: `❌ **Validasi Gagal:**\n- ${errors.join('\n- ')}`, flags: 64 } });
  }

  // Jawab proses "Deferred" karena nyari DB butuh waktu lebih dari 3 detik
  // Kita harus edit pesannya nanti setelah beres
  // NOTE: Di Next.js Serverless API, lu butuh trigger background job, 
  // tapi buat skenario ini kita bikin simple return setelah pencarian DB cepat.

  // 4. CARI PEMAIN DI DB (Vercel KV)
  let foundTeamSlug = null;
  let foundTeamData: any = null;
  let playerIndex = -1;

  const allTeamSlugs = await kv.smembers('global:teams');
  const allTeamDatas = await Promise.all(allTeamSlugs.map(async (slug) => {
    const data = await kv.hgetall(`teams:${slug}`);
    return { slug, data };
  }));

  for (const team of allTeamDatas) {
    if (!team.data || !team.data.players) continue;
    let players = [];
    try {
      players = typeof team.data.players === 'string' ? JSON.parse(team.data.players) : team.data.players;
    } catch (e) { continue; }

    // Cari pakai username discord lama atau yang terdaftar
    const idx = players.findIndex((p: any) => p.discord.toLowerCase() === targetUsername || p.id === targetUserId);
    if (idx !== -1) {
      foundTeamSlug = team.slug;
      foundTeamData = { ...team.data, players };
      playerIndex = idx;
      break;
    }
  }

  if (!foundTeamSlug || playerIndex === -1) {
    return NextResponse.json({ type: 4, data: { content: `🔍 Data Tidak Ditemukan: User <@${targetUserId}> tidak ada di roster manapun.`, flags: 64 } });
  }

  // 5. UPDATE DATA
  const player = foundTeamData.players[playerIndex];
  const oldIgn = player.ign;
  if (newIgn) player.ign = newIgn;
  if (newDiscord) player.discord = newDiscord;
  if (newDuelId) {
    player.duelId = newDuelId;
    player.idDuelLinks = newDuelId; // Sinkronisasi field lama kalau ada
  }

  // Simpan ke DB
  foundTeamData.players = JSON.stringify(foundTeamData.players);
  await kv.hset(`teams:${foundTeamSlug}`, foundTeamData);

  // 6. UPDATE NICKNAME DISCORD (Hanya jika IGN diubah)
  if (newIgn && newIgn !== oldIgn) {
    await discordAPI(`/guilds/${guildId}/members/${targetUserId}`, 'PATCH', { nick: newIgn });
  }

  // 7. KASIH RESPON SUKSES
  return NextResponse.json({ type: 4, data: { 
    content: `✅ **Berhasil Update Roster!**\nUser: <@${targetUserId}>\nTim: **${foundTeamData.namaTim}**\n\n**Perubahan:**\n${newIgn ? `- IGN: ${oldIgn} ➔ ${newIgn}\n` : ''}${newDiscord ? `- Discord: ${newDiscord}\n` : ''}${newDuelId ? `- Duel ID: ${newDuelId}` : ''}` 
  }});
}
