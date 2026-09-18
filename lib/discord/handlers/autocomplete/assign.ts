import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/commands/assign/types';
import { filterChoices } from './types';

export async function handleAssignAutocomplete(interaction: any) {
  try {
    // 1. Deteksi nama sub-command (unassign, remove, swap, dsb.)
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

    // 🟢 Filter Match: isFinished Wajib FALSE + Cek Tanggal
    if (focused.name === 'match' || focused.name === 'match_a' || focused.name === 'match_b') {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      const now = Date.now();

      const filtered = schedules.filter((m) => {
        // Wajib: punya channel discord, ada tanggalnya, dan BELUM SELESAI (isFinished: false)
        if (!m.discordChannelId || !m.matchDate || m.isFinished) return false;

        const matchTime = new Date(m.matchDate).getTime();
        if (isNaN(matchTime)) return false;

        if (isUnassign) {
          // Unassign: Tanggal sudah lewat dari hari ini & isFinished false
          return matchTime < now;
        }

        // Assign & Swap: Tanggal belum lewat (hari ini ke depan) & isFinished false
        return matchTime >= now;
      });

      // Urutkan jadwal
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
            (m) => `${m.id}: ${m.teamAName} vs ${m.teamBName}`,
            (m) => m.id,
            (m) => [m.id, m.teamAName, m.teamBName]
          ),
        },
      };
    }

    if (focused.name === 'user') {
      const staffList = (await kv.get<StaffItem[]>(typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees')) || [];
      const sorted = [...staffList].sort((a, b) => a.discordName.localeCompare(b.discordName, 'id', { sensitivity: 'base' }));
      return {
        type: 8,
        data: { choices: filterChoices(sorted, query, (s) => s.discordName, (s) => s.discordId) },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error assign autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}
