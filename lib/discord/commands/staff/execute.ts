import { kv } from '@vercel/kv';
import { isValidSnowflake } from '@/lib/discord/utils';
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

    await kv.set(kvKey, staffList);

    return {
      success: true,
      staffName: finalName,
      message: `✅ Berhasil mendaftarkan **${finalName}** (<@${targetDiscordId}>) sebagai **${roleLabel}** aktif!`,
    };
  }

  if (action === 'REMOVE') {
    const targetIdx = staffList.findIndex((s) => s.discordId === targetDiscordId);
    if (targetIdx === -1) {
      throw new Error(`Staf aktif dengan ID tersebut tidak ditemukan di daftar ${roleLabel}.`);
    }

    const removedName = staffList[targetIdx].discordName;

    // Kosongkan discordId agar tidak muncul lagi di autocomplete penugasan,
    // namun data nama dipertahankan agar tidak merusak relasi riwayat report
    staffList[targetIdx].discordId = '';
    await kv.set(kvKey, staffList);

    return {
      success: true,
      staffName: removedName,
      message: `✅ Staf **${removedName}** telah dikeluarkan dari jajaran **${roleLabel}** aktif.\n\`discordId\` telah dibuang sehingga tidak akan muncul lagi di autocomplete, dan arsip riwayat pertandingan tetap terjaga.`,
    };
  }

  throw new Error('Aksi tidak dikenali.');
      }
