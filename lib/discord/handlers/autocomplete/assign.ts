import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/commands/assign/types';
import { filterChoices } from './types';

function formatMatchDayTime(isoString?: string): string {
  if (!isoString) return 'Jadwal Belum Ditentukan';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Jadwal Tidak Valid';

    const dayName = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      timeZone: 'Asia/Jakarta',
    }).format(d);

    const timeStr = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(d);

    return `${dayName} (${timeStr.replace(':', '.')} WIB)`;
  } catch {
    return 'Jadwal Belum Ditentukan';
  }
}

export async function handleAssignAutocomplete(interaction: any) {
  try {
    const subCommandObj = interaction.data?.options?.find(
      (opt: any) => opt.type === 1 || opt.type === 2
    );
    const subCommandName = subCommandObj?.name || interaction.data?.name;
    const isUnassign = subCommandName === 'unassign' || subCommandName === 'remove';

    const optionsList = subCommandObj?.options || interaction.data?.options || [];
    const focused = optionsList.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const typeOption = optionsList.find((opt: any) => opt.name === 'type')?.value;
    const query = String(focused.value || '');

    // 🟢 1. Filter Pilihan Match
    if (focused.name === 'match' || focused.name === 'match_a' || focused.name === 'match_b') {
      if (isUnassign && !typeOption) {
        return {
          type: 8,
          data: {
            choices: [
              {
                name: "⚠️ Harap pilih opsi 'type' terlebih dahulu!",
                value: 'EMPTY_TYPE',
              },
            ],
          },
        };
      }

      // Ambil pekan aktif dan daftar jadwal dari KV
      const [schedules, activeWeek] = await Promise.all([
        kv.get<MatchScheduleItem[]>('twi:schedules'),
        kv.get<number>('twi:current_week'),
      ]);

      const currentWeek = activeWeek || 10;
      const matchScheduleList = schedules || [];

      const filtered = matchScheduleList.filter((m) => {
        if (!m.id || !m.discordChannelId || !m.matchDate) return false;

        // Kunci hanya pada pekan saat ini
        if (m.weekNumber && m.weekNumber !== currentWeek) return false;

        const scoreA = Number(m.scoreA) || 0;
        const scoreB = Number(m.scoreB) || 0;
        const isMatchDone = Boolean(m.isFinished) || scoreA >= 10 || scoreB >= 10;

        if (isUnassign) {
          // 1. REFEREE: Hanya match di pekan aktif yang SUDAH SELESAI
          if (typeOption === 'REFEREE') {
            return isMatchDone;
          }

          // 2. STREAMER: Match di pekan aktif (baik sebelum mulai atau selesai)
          if (typeOption === 'STREAMER') {
            return true;
          }

          return true;
        }

        // ASSIGN & SWAP: Hanya match pekan aktif yang BELUM SELESAI
        return !isMatchDone;
      });

      // Urutkan jadwal sesuai waktu tanding
      filtered.sort((a, b) => {
        const timeA = new Date(a.matchDate).getTime();
        const timeB = new Date(b.matchDate).getTime();
        return isUnassign ? timeB - timeA : timeA - timeB;
      });

      return {
        type: 8,
        data: {
          choices: filterChoices(
            filtered,
            query,
            (m) => {
              const isMatchDone =
                Boolean(m.isFinished) || (Number(m.scoreA) || 0) >= 10 || (Number(m.scoreB) || 0) >= 10;
              const statusTag = isMatchDone ? ' [Selesai]' : '';
              return `${formatMatchDayTime(m.matchDate)}: ${m.teamAName} vs ${m.teamBName}${statusTag}`;
            },
            (m) => m.id,
            (m) => [formatMatchDayTime(m.matchDate), m.teamAName, m.teamBName]
          ),
        },
      };
    }

    // 🟢 2. Filter Pilihan Staf (untuk /assign user: dan /staff target_staff:)
    if (focused.name === 'user' || focused.name === 'target_staff') {
      const staffKey = typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
      const staffList = (await kv.get<StaffItem[]>(staffKey)) || [];

      // Filter ketat: HANYA staf yang memiliki discordId aktif (belum dikeluarkan)
      const activeStaff = staffList.filter((s) => Boolean(s.discordId && s.discordId.trim() !== ''));

      const sorted = [...activeStaff].sort((a, b) =>
        a.discordName.localeCompare(b.discordName, 'id', { sensitivity: 'base' })
      );

      return {
        type: 8,
        data: {
          choices: filterChoices(
            sorted,
            query,
            (s) => s.discordName,
            (s) => s.discordId,
            (s) => [s.discordName, s.discordId]
          ),
        },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error assign autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}
