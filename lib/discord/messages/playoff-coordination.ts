import { kv } from '@vercel/kv';
import { MatchScheduleItem, TOURNAMENT_RULES } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

const KV_PLAYOFF_COORD_KEY = 'twi:playoff_coordination_channel';

interface SyncPlayoffCoordinationParams {
  currentWeek: number;
  schedules: MatchScheduleItem[];
  parentCategoryId?: string;
}

export async function syncPlayoffCoordinationChannel({
  currentWeek,
  schedules,
  parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID,
}: SyncPlayoffCoordinationParams) {
  try {
    const playInsWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK; // Week 8
    const quarterWeek = playInsWeek + 1;                     // Week 9

    const existingChannelId = await kv.get<string>(KV_PLAYOFF_COORD_KEY);

    const deleteOldChannel = async () => {
      if (existingChannelId) {
        await discordAPI(`/channels/${existingChannelId}`, 'DELETE').catch(() => null);
        await kv.del(KV_PLAYOFF_COORD_KEY);
      }
    };

    // 1. SEMIFINAL KE ATAS (Week > 9): Hanya hapus channel lama tanpa membuat baru
    if (currentWeek > quarterWeek) {
      if (existingChannelId) {
        await deleteOldChannel();
      }
      return { action: 'DELETED_ONLY' };
    }

    // 2. DI LUAR WEEK 8 & 9 (Misal babak Regular): Tidak lakukan apa-apa
    if (currentWeek !== playInsWeek && currentWeek !== quarterWeek) {
      return { action: 'SKIPPED' };
    }

    // 3. Hapus channel dari week sebelumnya terlebih dahulu
    await deleteOldChannel();

    const isPlayIns = currentWeek === playInsWeek;
    const stageTitle = isPlayIns ? 'Play-Ins' : 'Quarter Finals';
    const channelName = isPlayIns ? '🤝-koordinasi-playins' : '🤝-koordinasi-quarter';

    // Ambil semua match pada week aktif ini
    const weekMatches = schedules.filter(
      (m) => Number(m.weekNumber || (m as any).week || (m as any).matchWeek || 1) === currentWeek
    );

    const involvedTeamRoles = new Set<string>();
    const involvedTeamNames: string[] = [];

    weekMatches.forEach((m: any) => {
      if (m.teamARoleId) involvedTeamRoles.add(m.teamARoleId);
      if (m.teamBRoleId) involvedTeamRoles.add(m.teamBRoleId);
      if (m.teamAName) involvedTeamNames.push(m.teamAName);
      if (m.teamBName) involvedTeamNames.push(m.teamBName);
    });

    // 4. Permission Overwrite:
    // VIEW_CHANNEL (1024) | SEND_MESSAGES (2048) | READ_MESSAGE_HISTORY (65536) | MENTION_EVERYONE (131072 - agar bisa tag role tim)
    const ALLOW_TEAM_PERMISSIONS = 1024 | 2048 | 65536 | 131072;

    const permission_overwrites: any[] = [
      // Tutup total untuk @everyone
      {
        id: DISCORD_CONFIG.GUILD_ID,
        type: 0,
        allow: '0',
        deny: '1024',
      },
    ];

    // Beri akses penuh chat & tag role hanya untuk tim yang bertanding
    involvedTeamRoles.forEach((roleId) => {
      permission_overwrites.push({
        id: roleId,
        type: 0,
        allow: String(ALLOW_TEAM_PERMISSIONS),
        deny: '0',
      });
    });

    // 5. Buat channel baru di bawah kategori match
    const payload: any = {
      name: channelName,
      type: 0,
      permission_overwrites,
      parent_id: parentCategoryId,
    };

    const createdChannel = await discordAPI(
      `/guilds/${DISCORD_CONFIG.GUILD_ID}/channels`,
      'POST',
      payload
    );

    if (!createdChannel?.id) {
      throw new Error('Gagal membuat channel koordinasi playoff di Discord.');
    }

    await kv.set(KV_PLAYOFF_COORD_KEY, createdChannel.id);

    // 6. Format tim unik & payload embed
    const uniqueTeamsList = Array.from(new Set(involvedTeamNames))
      .map((name) => `• **${name}**`)
      .join('\n');

    const embed = {
      title: `🤝 Room Koordinasi Playoff — ${stageTitle}`,
      description:
        `Room ini dibuka khusus sebagai sarana komunikasi antartim untuk koordinasi internal maupun kesepakatan tukar jadwal pertandingan (**swap schedule**).\n\n` +
        `📋 **Tim yang Berlaga di Pekan Ini:**\n${uniqueTeamsList || '-'}\n\n` +
        `📌 **Regulasi Swap / Reschedule:**\n` +
        `1. **Kuota Harian:** Maksimal **${TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF} match per hari**.\n` +
        `2. **Kesepakatan Bersama:** Wajib disetujui oleh seluruh perwakilan tim dari kedua match yang bersangkutan.\n` +
        `3. **Diskusi Langsung:** Silakan langsung tag role tim yang ingin diajak bertukar jadwal di room ini.\n` +
        `4. **Pengesahan:** Setelah mencapai kata sepakat, silakan konfirmasi jadwal baru di room match masing-masing agar diperbarui di jadwal resmi.`,
      color: 0xf59e0b,
      footer: { text: `Team Wars Indonesia • Playoff ${stageTitle}` },
      timestamp: new Date().toISOString(),
    };

    // Kirim pesan dengan mention @ROLE_DUELIST
    await discordAPI(`/channels/${createdChannel.id}/messages`, 'POST', {
      content: `<@&${DISCORD_CONFIG.ROLE_DUELIST}>`,
      embeds: [embed],
    }).catch(() => null);

    return { action: 'CREATED', channelId: createdChannel.id };
  } catch (error) {
    console.error('Error in syncPlayoffCoordinationChannel:', error);
    throw error;
  }
          }
  
