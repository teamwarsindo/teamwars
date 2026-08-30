import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import {
  executeTransferOut,
  executeTransferAdd,
  executeTransferEditDl,
  executeTransferSetLeader,
  PlayerItem,
  getTeamBySlug,
  parsePlayers,
} from '@/lib/discord/services/transfer-service';
import { createCampSuccessEmbed, createCampFailureEmbed } from '@/lib/discord/messages/transfer-log';

function getSubcommandData(interaction: any) {
  const options = interaction.data?.options || [];
  const subcommandObj = options.find((o: any) => o.type === 1);
  if (!subcommandObj) return { subcommand: null, opts: [] };
  return {
    subcommand: subcommandObj.name,
    opts: subcommandObj.options || [],
  };
}

export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
    if (!teamSlug) return { type: 8, data: { choices: [] } };

    const { opts } = getSubcommandData(interaction);
    const focusedOption = opts.find((o: any) => o.focused);
    if (!focusedOption || focusedOption.name !== 'user') return { type: 8, data: { choices: [] } };

    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

    const players: PlayerItem[] = parsePlayers(teamData.players);
    const searchValue = (focusedOption.value || '').toLowerCase();

    const choices = players
      .filter((p) => p.ign.toLowerCase().includes(searchValue) || p.discord.toLowerCase().includes(searchValue))
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ign} (@${p.discord}) - ${p.role}`,
        value: p.discordId,
      }));

    return { type: 8, data: { choices } };
  } catch {
    return { type: 8, data: { choices: [] } };
  }
}

export async function handleTransferCommand(interaction: any) {
  const { subcommand, opts } = getSubcommandData(interaction);
  const channelId = interaction.channel_id;
  const actorId = interaction.member?.user?.id;
  const actorRoles: string[] = interaction.member?.roles || [];

  if (!subcommand) {
    return { type: 4, data: { content: '❌ Subcommand tidak valid!', flags: 64 } };
  }

  // 1. Deteksi Tim dari Channel Camp
  const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
  if (!teamSlug) {
    return {
      type: 4,
      data: { content: '❌ Slash command `/transfer` hanya dapat digunakan di dalam Channel Camp Tim resmi.', flags: 64 },
    };
  }

  // 2. Ambil data Tim & Validasi Role Aktor
  const teamRes = await getTeamBySlug(teamSlug);
  if (!teamRes) {
    return {
      type: 4,
      data: { content: `❌ Data tim dengan slug \`${teamSlug}\` tidak ditemukan di database.`, flags: 64 },
    };
  }

  const { data: teamData } = teamRes;
  const players: PlayerItem[] = parsePlayers(teamData.players);
  const isAdmin = !!DISCORD_CONFIG.ROLE_ADMIN && actorRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
  const actorInRoster = players.find((p) => p.discordId === actorId);
  const isKetua = actorInRoster?.role === 'Ketua';
  const isWakil = actorInRoster?.role === 'Wakil Ketua';

  if (!isAdmin && !isKetua && !isWakil) {
    return {
      type: 4,
      data: { content: '❌ **Akses Ditolak!** Hanya Ketua Tim, Wakil Ketua Tim, atau Admin yang dapat mengeksekusi transfer.', flags: 64 },
    };
  }

  const actorRoleText = isAdmin ? 'Admin' : isKetua ? 'Ketua Tim' : 'Wakil Ketua Tim';
  const targetUserId = opts.find((o: any) => o.name === 'user')?.value;

  try {
    // -------------------------------------------------------------
    // SUBCOMMAND: ADD
    // -------------------------------------------------------------
    if (subcommand === 'add') {
      const ign = opts.find((o: any) => o.name === 'ign')?.value;
      const rawIdDl = opts.find((o: any) => o.name === 'id_dl')?.value;

      if (!targetUserId || !ign || !rawIdDl) {
        return { type: 4, data: { content: '❌ Option `user`, `ign`, dan `id_dl` wajib diisi!', flags: 64 } };
      }

      const resolvedUsers = interaction.data?.resolved?.users || {};
      const targetUserData = resolvedUsers[targetUserId] || {};
      const targetUsername = targetUserData.username || targetUserId;

      // Request GET Guild Member untuk ambil roles target
      const guildMemberRes = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}`, 'GET');
      const targetRoles: string[] = guildMemberRes?.roles || [];

      const result = await executeTransferAdd({
        teamSlug,
        targetDiscordId: targetUserId,
        targetUsername,
        ign,
        rawIdDl,
        targetRoles,
      });

      const statusNote = result.isOldPlayer ? 'Transfer Pemain Lama (Potong Kuota)' : 'Free Agent Murni (Gratis Kuota)';
      const details = `**Akun:** <@${targetUserId}>\n**IGN:** ${result.addedPlayer.ign}\n**ID Duel Links:** ${result.addedPlayer.idDuelLinks}\n**Status:** ${statusNote}`;
      const successEmbed = createCampSuccessEmbed(actorId, actorRoleText, 'ADD (Tambah Pemain)', details, result.currentQuota);

      return { type: 4, data: successEmbed };
    }

    // -------------------------------------------------------------
    // SUBCOMMAND: OUT
    // -------------------------------------------------------------
    if (subcommand === 'out') {
      if (!targetUserId) return { type: 4, data: { content: '❌ Option `user` wajib diisi!', flags: 64 } };

      const result = await executeTransferOut(teamSlug, targetUserId);
      const details = `**Akun:** <@${result.removedPlayer.discordId}>\n**IGN:** ${result.removedPlayer.ign}\n**ID Duel Links:** ${result.removedPlayer.idDuelLinks}\n**Status:** Dipindahkan ke Free Agent Pool`;
      const successEmbed = createCampSuccessEmbed(actorId, actorRoleText, 'OUT (Keluarkan Pemain)', details, result.currentQuota);

      return { type: 4, data: successEmbed };
    }

    // -------------------------------------------------------------
    // SUBCOMMAND: EDIT
    // -------------------------------------------------------------
    if (subcommand === 'edit') {
      const newIdDl = opts.find((o: any) => o.name === 'new_id_dl')?.value;
      const position = opts.find((o: any) => o.name === 'position')?.value as 'Ketua' | 'Wakil Ketua' | undefined;

      if (!targetUserId) return { type: 4, data: { content: '❌ Option `user` wajib diisi!', flags: 64 } };
      if (!newIdDl && !position) {
        return { type: 4, data: { content: '❌ Wajib mengisikan salah satu opsi: `new_id_dl` atau `position`!', flags: 64 } };
      }

      if (newIdDl) {
        const resultDl = await executeTransferEditDl(teamSlug, targetUserId, newIdDl);
        const details = `**Akun:** <@${targetUserId}>\n**IGN:** ${resultDl.player.ign}\n**ID Lama:** ${resultDl.oldDl}\n**ID Baru:** ${resultDl.newDl}`;
        const successEmbed = createCampSuccessEmbed(actorId, actorRoleText, 'EDIT (Ganti ID Duel Links)', details, resultDl.currentQuota);
        return { type: 4, data: successEmbed };
      }

      if (position) {
        const resultLeader = await executeTransferSetLeader(teamSlug, targetUserId, position, actorId, isAdmin, isKetua);
        const details = `**Akun:** <@${targetUserId}>\n**IGN:** ${resultLeader.player.ign}\n**Jabatan Baru:** \`${resultLeader.newRole}\``;
        const successEmbed = createCampSuccessEmbed(actorId, actorRoleText, `EDIT (Angkat ${resultLeader.newRole})`, details, resultLeader.currentQuota);
        return { type: 4, data: successEmbed };
      }
    }

    return { type: 4, data: { content: '❌ Subcommand tidak dikenali!', flags: 64 } };
  } catch (error: any) {
    const failEmbed = createCampFailureEmbed(
      actorId,
      subcommand.toUpperCase(),
      targetUserId || null,
      error.message || 'Terjadi kesalahan saat memproses transfer.'
    );
    return { type: 4, data: failEmbed };
  }
                           }
                           
