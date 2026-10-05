import { kv } from '@vercel/kv';
import { isValidSnowflake, discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { StaffItem } from '../assign/types';

export interface ExecuteManageStaffParams {
  action: 'ADD' | 'REMOVE';
  staffType: 'REFEREE' | 'STREAMER';
  targetDiscordId: string;
  discordName?: string;
}

export interface ExecuteManageStaffResult {
  success: boolean;
  message: string;
  staffName: string;
}

export async function executeManageStaff(
  params: ExecuteManageStaffParams
): Promise<ExecuteManageStaffResult> {
  const { action, staffType, targetDiscordId, discordName } = params;

  if (!isValidSnowflake(targetDiscordId)) {
    throw new Error('ID Pengguna Discord tidak valid!');
  }

  const kvKey = staffType === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const roleLabel = staffType === 'REFEREE' ? 'Referee' : 'Streamer';
  const targetRoleId =
    staffType === 'REFEREE' ? DISCORD_CONFIG.ROLE_REFEREE : DISCORD_CONFIG.ROLE_STREAMER;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];

  if (action === 'ADD') {
    const finalName = discordName?.trim() || targetDiscordId;
    const existingIdx = staffList.findIndex(
      (s) =>
        s.discordId === targetDiscordId ||
        s.discordName.toLowerCase() === finalName.toLowerCase()
    );

    if (existingIdx !== -1) {
      staffList[existingIdx].discordId = targetDiscordId;
      staffList[existingIdx].discordName = finalName;
    } else {
      staffList.push({
        discordId: targetDiscordId,
        discordName: finalName,
      });
    }

    // 1. Simpan perubahan ke Vercel KV
    await kv.set(kvKey, staffList);

    // 2. Berikan Role Discord ke User
    if (guildId && targetRoleId) {
      try {
        await discordAPI(
          `/guilds/${guildId}/members/${targetDiscordId}/roles/${targetRoleId}`,
          'PUT'
        );
      } catch (roleErr) {
        console.warn(`Gagal memberikan role Discord ${roleLabel}:`, roleErr);
      }
    }

    return {
      success: true,
      staffName: finalName,
      message: `✅ Berhasil mendaftarkan **${finalName}** (<@${targetDiscordId}>) sebagai **${roleLabel}** aktif & role Discord telah diberikan!`,
    };
  }

  if (action === 'REMOVE') {
    const targetIdx = staffList.findIndex((s) => s.discordId === targetDiscordId);
    if (targetIdx === -1) {
      throw new Error(`Staf aktif dengan ID tersebut tidak ditemukan di daftar ${roleLabel}.`);
    }

    const removedName = staffList[targetIdx].discordName;

    // 1. Kosongkan discordId di KV agar tidak muncul di autocomplete
    staffList[targetIdx].discordId = '';
    await kv.set(kvKey, staffList);

    // 2. Cabut Role Discord dari User
    if (guildId && targetRoleId) {
      try {
        await discordAPI(
          `/guilds/${guildId}/members/${targetDiscordId}/roles/${targetRoleId}`,
          'DELETE'
        );
      } catch (roleErr) {
        console.warn(`Gagal mencabut role Discord ${roleLabel}:`, roleErr);
      }
    }

    return {
      success: true,
      staffName: removedName,
      message: `✅ Staf **${removedName}** telah dikeluarkan dari **${roleLabel}** aktif.\nRole Discord telah dicabut, \`discordId\` dibersihkan dari autocomplete, dan arsip riwayat laga tetap aman.`,
    };
  }

  throw new Error('Aksi tidak dikenali.');
}
