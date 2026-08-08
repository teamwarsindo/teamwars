import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import {
  executeTransferOut,
  executeTransferAdd,
  executeTransferEditDl,
  executeTransferSetLeader,
  parsePlayers,
  PlayerItem,
} from '@/lib/discord/services/transfer-service';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return (
    isAdmin ||
    (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
    (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
  );
}

/**
 * Autocomplete Handler untuk memilih Pemain dari Roster / Tim Target
 */
export async function handleTransferAutocomplete(interaction: any) {
  const opts = interaction.data?.options || [];
  const focusedOption = opts.find((o: any) => o.focused);
  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const userId = interaction.member?.user?.id;
  const userUsername = interaction.member?.user?.username;

  // Cari teamSlug berdasarkan Discord User ID
  let userTeamSlug = await kv.hget<string>('global:discord_ids', userId);
  if (!userTeamSlug && userUsername) {
    userTeamSlug = await kv.hget<string>('global:discord', userUsername.toLowerCase());
  }

  if (!userTeamSlug) return { type: 8, data: { choices: [] } };

  const teamData = await kv.hgetall<any>(`teams:${userTeamSlug}`);
  if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

  const players: PlayerItem[] = parsePlayers(teamData.players);
  const searchValue = (focusedOption.value || '').toLowerCase();

  const choices = players
    .filter((p) => p.ign.toLowerCase().includes(searchValue) || p.discord.toLowerCase().includes(searchValue))
    .slice(0, 25)
    .map((p) => ({
      name: `${p.ign} (@${p.discord}) - ${p.role}`,
      value: p.discord,
    }));

  return { type: 8, data: { choices } };
}

/**
 * Command Handler utama untuk /transfer
 */
export async function handleTransferCommand(interaction: any) {
  const opts = interaction.data?.options || [];
  const action = opts.find((o: any) => o.name === 'action')?.value;

  const userId = interaction.member?.user?.id;
  const userUsername = interaction.member?.user?.username;
  const roles: string[] = interaction.member?.roles || [];
  const isAdmin = isAuth(interaction);

  // Cari tim pelaksana
  let teamSlug = await kv.hget<string>('global:discord_ids', userId);
  if (!teamSlug && userUsername) {
    teamSlug = await kv.hget<string>('global:discord', userUsername.toLowerCase());
  }

  // Pilihan khusus Admin (bisa memilih tim via parameter team_slug jika disiapkan, atau fallback ke userTeamSlug)
  if (!teamSlug && !isAdmin) {
    return {
      type: 4,
      data: { content: '❌ **Akses Ditolak!** Kamu harus menjadi Ketua/Wakil/Admin tim untuk menggunakan command ini.', flags: 64 },
    };
  }

  try {
    // 1. ACTION: OUT (Keluarkan Pemain)
    if (action === 'out') {
      const targetUser = opts.find((o: any) => o.name === 'user')?.value;
      if (!targetUser) return { type: 4, data: { content: '❌ Option `user` wajib diisi!', flags: 64 } };

      const result = await executeTransferOut(teamSlug!, targetUser);
      return {
        type: 4,
        data: { content: `✅ **Berhasil!** Pemain **${result.removedIgn}** telah dikeluarkan dari tim **${result.teamName}**.`, flags: 64 },
      };
    }

    // 2. ACTION: ADD (Masukkan Pemain Baru / Global)
    if (action === 'add') {
      const targetDiscordId = opts.find((o: any) => o.name === 'user')?.value;
      const ign = opts.find((o: any) => o.name === 'ign')?.value;
      const rawIdDl = opts.find((o: any) => o.name === 'id_dl')?.value;

      if (!targetDiscordId || !ign || !rawIdDl) {
        return { type: 4, data: { content: '❌ Option `user`, `ign`, dan `id_dl` wajib diisi!', flags: 64 } };
      }

      // Resolved Target User Data
      const resolvedUsers = interaction.data?.resolved?.users || {};
      const targetUserData = resolvedUsers[targetDiscordId] || {};
      const targetUsername = targetUserData.username || targetDiscordId;

      const result = await executeTransferAdd({
        teamSlug: teamSlug!,
        targetDiscordId,
        targetUsername,
        ign,
        rawIdDl,
      });

      return {
        type: 4,
        data: { content: `✅ **Berhasil!** Pemain **${result.addedIgn}** berhasil dimasukkan ke dalam tim **${result.teamName}**.`, flags: 64 },
      };
    }

    // 3. ACTION: EDIT-DL (Ganti ID Duel Links)
    if (action === 'edit-dl') {
      const targetUser = opts.find((o: any) => o.name === 'user')?.value;
      const newIdDl = opts.find((o: any) => o.name === 'new_id_dl')?.value;

      if (!targetUser || !newIdDl) {
        return { type: 4, data: { content: '❌ Option `user` dan `new_id_dl` wajib diisi!', flags: 64 } };
      }

      const result = await executeTransferEditDl(teamSlug!, targetUser, newIdDl);
      return {
        type: 4,
        data: { content: `✅ **Berhasil!** ID Duel Links pemain **${result.ign}** diperbarui menjadi \`${result.newDl}\`.`, flags: 64 },
      };
    }

    // 4. ACTION: SET-LEADER (Ganti Ketua/Wakil - Khusus Admin)
    if (action === 'set-leader') {
      if (!isAdmin) {
        return { type: 4, data: { content: '❌ Khusus **Admin** yang dapat mengubah posisi Ketua/Wakil!', flags: 64 } };
      }

      const targetUser = opts.find((o: any) => o.name === 'user')?.value;
      const position = opts.find((o: any) => o.name === 'position')?.value as 'Ketua' | 'Wakil Ketua';

      if (!targetUser || !position) {
        return { type: 4, data: { content: '❌ Option `user` dan `position` wajib diisi!', flags: 64 } };
      }

      const result = await executeTransferSetLeader(teamSlug!, targetUser, position);
      return {
        type: 4,
        data: { content: `✅ **Berhasil!** **${result.ign}** sekarang ditugaskan sebagai **${result.newRole}** tim **${result.teamName}**.`, flags: 64 },
      };
    }

    return { type: 4, data: { content: '❌ Action tidak dikenali!', flags: 64 } };
  } catch (error: any) {
    return {
      type: 4,
      data: { content: error.message || '❌ Terjadi kesalahan saat memproses transfer.', flags: 64 },
    };
  }
}