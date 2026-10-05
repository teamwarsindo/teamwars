import { kv } from '@vercel/kv';
import { isValidSnowflake, discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library';
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
  const targetChannelId =
    staffType === 'REFEREE'
      ? (DISCORD_CONFIG as any).CH_REFEREE || (DISCORD_CONFIG as any).CH_REFEREES
      : (DISCORD_CONFIG as any).CH_STREAMER || (DISCORD_CONFIG as any).CH_STREAMERS;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  const [staffList, schedules] = await Promise.all([
    kv.get<StaffItem[]>(kvKey).then((res) => res || []),
    kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
  ]);

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

    // 1. Berikan Role Discord ke User
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

    // 2. Kirim pesan pengumuman ke Channel Divisi Staf masing-masing
    if (targetChannelId) {
      try {
        const welcomeMessage =
          staffType === 'REFEREE'
            ? `⚖️ <@${targetDiscordId}> telah resmi bergabung sebagai **Referee (Wasit)** turnamen! Selamat bertugas.`
            : `🎥 <@${targetDiscordId}> telah resmi bergabung sebagai **Streamer** turnamen! Selamat bertugas.`;

        await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
          content: welcomeMessage,
        });
      } catch (msgErr) {
        console.warn(`Gagal mengirim pengumuman staf ke channel ${roleLabel}:`, msgErr);
      }
    }

    return {
      success: true,
      staffName: finalName,
      message: `✅ Berhasil mendaftarkan **${finalName}** (<@${targetDiscordId}>) sebagai **${roleLabel}** aktif!\nRole telah diberikan dan pengumuman telah dikirim ke channel ${roleLabel}.`,
    };
  }

  if (action === 'REMOVE') {
    const targetIdx = staffList.findIndex((s) => s.discordId === targetDiscordId);
    if (targetIdx === -1) {
      throw new Error(`Staf aktif dengan ID tersebut tidak ditemukan di daftar ${roleLabel}.`);
    }

    const targetStaff = staffList[targetIdx];
    const isRef = staffType === 'REFEREE';

    // 1. Validasi: Cek apakah staf sedang aktif bertugas pada match yang belum tuntas
    const activeDuty = schedules.find((m) => {
      const assignedId = isRef ? m.refereeDiscordId : m.streamerDiscordId;
      if (assignedId !== targetDiscordId) return false;

      const scoreA = Number(m.scoreA) || 0;
      const scoreB = Number(m.scoreB) || 0;
      const isFinished = Boolean(m.isFinished) || scoreA >= 10 || scoreB >= 10;
      return !isFinished;
    });

    if (activeDuty) {
      throw new Error(
        `⛔ Ditolak! **${targetStaff.discordName}** sedang aktif bertugas di match **${activeDuty.id}** (${activeDuty.teamAName} vs ${activeDuty.teamBName}). Harap lakukan /unassign atau /swap-assign terlebih dahulu.`
      );
    }

    // 2. Validasi: Cek histori tugas di match sebelumnya
    const hasHistory = schedules.some((m) => {
      const assignedId = isRef ? m.refereeDiscordId : m.streamerDiscordId;
      const assignedName = isRef ? m.referee : m.streamer;
      return (
        assignedId === targetDiscordId ||
        (assignedName && assignedName.toLowerCase() === targetStaff.discordName.toLowerCase())
      );
    });

    let resultMessage = '';
    if (hasHistory) {
      // Ada histori: pertahankan entri nama, hanya buang discordId
      staffList[targetIdx].discordId = '';
      resultMessage = `✅ Staf **${targetStaff.discordName}** dinonaktifkan dari **${roleLabel}**.\n\`discordId\` dan role telah dicabut, histori laporan laga tetap aman.`;
    } else {
      // Belum pernah bertugas: hapus permanen dari KV
      staffList.splice(targetIdx, 1);
      resultMessage = `🗑️ Staf **${targetStaff.discordName}** dihapus permanen dari daftar **${roleLabel}** karena belum pernah memiliki histori tugas.`;
    }

    await kv.set(kvKey, staffList);

    // 3. Cabut role Discord (berlaku untuk yang punya histori maupun yang dihapus total)
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
      staffName: targetStaff.discordName,
      message: resultMessage,
    };
  }

  throw new Error('Aksi tidak dikenali.');
  }
