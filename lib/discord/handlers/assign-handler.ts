import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { StaffItem } from '@/app/api/tournament/staff/route';

function formatWIBShort(isoString: string): string {
  if (!isoString) return 'TBA';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'TBA';

  const day = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).replace('.', ':');
  return `${day} • ${time} WIB`;
}

// Helper untuk menghapus matchId dari riwayat staf lama jika terjadi overwrite / ganti staf
async function removeMatchFromOldStaff(
  kvKey: 'staff:referees' | 'staff:streamers',
  oldStaffDiscordId: string,
  matchId: string
) {
  if (!oldStaffDiscordId) return;

  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const index = staffList.findIndex((s) => s.discordId === oldStaffDiscordId);

  if (index !== -1) {
    const history = staffList[index].assignMatch || [];
    staffList[index].assignMatch = history.filter((id) => id !== matchId);
    await kv.set(kvKey, staffList);
  }
}

// 🟢 1. HANDLER AUTO-COMPLETE (STAF & MATCH)
export async function handleAssignAutocomplete(interaction: any) {
  const options = interaction.data?.options || [];
  const focusedOption = options.find((opt: any) => opt.focused);

  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const typeOption = options.find((opt: any) => opt.name === 'type')?.value;
  const query = (focusedOption.value || '').toLowerCase();

  // A. FILTER USER BERDASARKAN ROLE STAF (KV)
  if (focusedOption.name === 'user') {
    const kvKey = typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
    const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];

    const choices = staffList
      .filter((s) => s.discordName.toLowerCase().includes(query))
      .slice(0, 25)
      .map((s) => ({
        name: s.discordName,
        value: s.discordId,
      }));

    return { type: 8, data: { choices } };
  }

  // B. FILTER MATCH BERDASARKAN WEEK AKTIF & JAM MATCH
  if (focusedOption.name === 'match') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) return { type: 8, data: { choices: [] } };

    const sorted = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    const firstMonday = new Date(sorted[0].matchDate);
    firstMonday.setHours(0, 0, 0, 0);

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - firstMonday.getTime()) / (1000 * 3600 * 24));
    const currentWeekNum = Math.max(1, Math.floor(diffDays / 7) + 1);

    const activeMatches = sorted.filter((m) => {
      const matchDate = new Date(m.matchDate);
      const mDiffDays = Math.floor((matchDate.getTime() - firstMonday.getTime()) / (1000 * 3600 * 24));
      const mWeekNum = Math.floor(mDiffDays / 7) + 1;
      return mWeekNum === currentWeekNum;
    });

    const targetMatches = activeMatches.length > 0 ? activeMatches : sorted.slice(0, 25);

    const choices = targetMatches
      .filter((m) => {
        const text = `${m.id} ${m.teamAName} vs ${m.teamBName}`.toLowerCase();
        return text.includes(query);
      })
      .slice(0, 25)
      .map((m) => ({
        name: `${m.id.toUpperCase()}: ${m.teamAName} vs ${m.teamBName} (${formatWIBShort(m.matchDate)})`,
        value: m.id,
      }));

    return { type: 8, data: { choices } };
  }

  return { type: 8, data: { choices: [] } };
}

// 🟢 2. HANDLER EKSEKUSI SLASH COMMAND /ASSIGN
export async function handleAssignCommand(interaction: any) {
  const member = interaction.member;
  const userRoles: string[] = member?.roles || [];
  const permissions = BigInt(member?.permissions || '0');

  // 🔒 GATEKEEPING PERMISSION & ROLE
  const ADMINISTRATOR_PERMISSION = BigInt(0x8);
  const isServerAdmin = (permissions & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
  const isAdminRole = DISCORD_CONFIG.ROLE_ADMIN && userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
  const isChiefRole = DISCORD_CONFIG.ROLE_CHIEF && userRoles.includes(DISCORD_CONFIG.ROLE_CHIEF);

  if (!isServerAdmin && !isAdminRole && !isChiefRole) {
    return {
      type: 4,
      data: {
        content: '❌ **Akses Ditolak!** Command `/assign` hanya dapat digunakan oleh Admin & Chief.',
        flags: 64, // Ephemeral (Privat)
      },
    };
  }

  const options = interaction.data?.options || [];
  const assignType = options.find((o: any) => o.name === 'type')?.value;
  const targetDiscordId = options.find((o: any) => o.name === 'user')?.value;
  const matchId = options.find((o: any) => o.name === 'match')?.value;

  if (!assignType || !targetDiscordId || !matchId) {
    return {
      type: 4,
      data: { content: '❌ Data input tidak lengkap!', flags: 64 },
    };
  }

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const matchIndex = schedules.findIndex((m) => m.id === matchId);

  if (matchIndex === -1) {
    return {
      type: 4,
      data: { content: `❌ Match \`${matchId}\` tidak ditemukan!`, flags: 64 },
    };
  }

  const match = schedules[matchIndex];
  const kvKey = assignType === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const targetStaff = staffList.find((s) => s.discordId === targetDiscordId);
  const staffName = targetStaff?.discordName || `<@${targetDiscordId}>`;
  const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

  // 🚨 1. TOLAK JIKA SUDAH DI-ASSIGN DI MATCH INI (Mencegah Duplicate Log)
  const currentAssignedId = assignType === 'REFEREE' 
    ? match.refereeDiscordId 
    : (match.streamerDiscordId || match.casterDiscordId);

  if (currentAssignedId === targetDiscordId) {
    return {
      type: 4,
      data: {
        content: `⚠️ **Penugasan Ditolak!** **${staffName}** sudah terdaftar sebagai **${roleTitle}** di match **${match.id}** (${match.teamAName} vs ${match.teamBName}).`,
        flags: 64,
      },
    };
  }

  // 🔍 2. DETEKSI BENTROK JADWAL (Mencegah 2 match di jam persis sama)
  const targetMatchDate = match.matchDate;
  const conflictingMatch = schedules.find((m) => {
    if (m.id === match.id) return false;
    const isAssigned = assignType === 'REFEREE'
      ? m.refereeDiscordId === targetDiscordId
      : (m.streamerDiscordId || m.casterDiscordId) === targetDiscordId;

    return isAssigned && m.matchDate === targetMatchDate;
  });

  if (conflictingMatch) {
    return {
      type: 4,
      data: {
        content: `⚠️ **Bentrok Jadwal!** **${staffName}** sudah ditugaskan sebagai ${roleTitle} pada match lain (**${conflictingMatch.teamAName} vs ${conflictingMatch.teamBName}** - \`${conflictingMatch.id}\`) di jam yang sama!`,
        flags: 64,
      },
    };
  }

  // 🧹 3. BERSIHKAN MATCH DARI STAF LAMA JIKA TERJADI RE-ASSIGN / OVERWRITE
  if (currentAssignedId && currentAssignedId !== targetDiscordId) {
    await removeMatchFromOldStaff(kvKey, currentAssignedId, match.id);
  }

  // 💾 4. UPDATE DATA MATCH BARU
  if (assignType === 'REFEREE') {
    match.referee = staffName;
    match.refereeDiscordId = targetDiscordId;
  } else {
    match.streamer = staffName;
    match.caster = staffName;
    match.streamerDiscordId = targetDiscordId;
    match.casterDiscordId = targetDiscordId;
  }

  schedules[matchIndex] = match;
  await kv.set('twi:schedules', schedules);

  // 📢 5. TRIGGER SYNC MATCH INTERNAL VIA ENDPOINT API
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
    await fetch(`${origin}/api/tournament/sync-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id }),
    });
  } catch (err) {
    console.error('Gagal mentrigger sync-match:', err);
  }

  return {
    type: 4,
    data: {
      content: `✅ Berhasil menugaskan **${staffName}** sebagai **${roleTitle}** untuk match **${match.teamAName} vs ${match.teamBName}** (\`${match.id}\`)!`,
      flags: 64,
    },
  };
    }
