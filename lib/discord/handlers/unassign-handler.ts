import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

function isAuth(interaction: any): boolean {
  const member = interaction.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return isAdmin || (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) || (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF));
}

export async function handleUnassignCommand(interaction: any) {
  if (!isAuth(interaction)) return { type: 4, data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 } };

  const opts = interaction.data?.options || [];
  const matchId = opts.find((o: any) => o.name === 'match')?.value;
  const assignType = opts.find((o: any) => o.name === 'type')?.value; // 'REFEREE' | 'STREAMER'
  const reason = opts.find((o: any) => o.name === 'reason')?.value; // 'COMPLETED' | 'REPLACED'

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) return { type: 4, data: { content: '❌ Match tidak ditemukan!', flags: 64 } };

  const match = schedules[idx];
  const roleTitle = assignType === 'REFEREE' ? 'Referee' : 'Streamer';

  // Simpan data staf lama untuk pencabutan role & log
  const oldStaffId = assignType === 'REFEREE' 
    ? match.refereeDiscordId 
    : (match.streamerDiscordId || match.casterDiscordId);

  const oldStaffName = assignType === 'REFEREE' ? match.referee : match.streamer;

  if (!oldStaffId) {
    return {
      type: 4,
      data: { content: `⚠️ Tidak ada **${roleTitle}** yang ditugaskan di match **${match.id}**.`, flags: 64 },
    };
  }

  // 1. KOSONGKAN DATA STAF DI REDIS SCHEDULE
  if (assignType === 'REFEREE') {
    delete match.referee;
    delete match.refereeDiscordId;
  } else {
    delete match.streamer;
    delete match.caster;
    delete match.streamerDiscordId;
    delete match.casterDiscordId;
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  // 2. TRIGGER SYNC-MATCH (Sistem internal akan otomatis meng-update Opening Embed di Channel Match & Mencabut Permission/Role)
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
  try {
    await fetch(`${origin}/api/tournament/sync-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        matchId: match.id, 
        action: 'UNASSIGN', 
        unassignType: assignType, 
        removedStaffId: oldStaffId 
      }),
    });
  } catch (err) {
    console.error('Gagal sync match pasca unassign:', err);
  }

  // 3. UPDATE EMBED DI #ASSIGNMENT-LOG TANPA MERUBAH STRUKTUR ASLI
  const logMsgId = assignType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;
  const assignChannelId = DISCORD_CONFIG.CH_ASSIGN;

  if (logMsgId && assignChannelId) {
    const nowUnix = Math.floor(Date.now() / 1000);
    const reasonText = reason === 'COMPLETED' ? '✅ MATCH SELESAI' : '⛔ PENUGASAN DICABUT / GANTI STAFF';

    // Ambil pesan log lama dari Discord agar strukturnya persis 100% sama
    const existingMsg = await discordAPI(`/channels/${assignChannelId}/messages/${logMsgId}`, 'GET').catch(() => null);

    if (existingMsg && existingMsg.embeds && existingMsg.embeds[0]) {
      const oldEmbed = existingMsg.embeds[0];

      // Cukup ubah Title/Footer/Color tanpa merusak layout fields
      const updatedEmbed = {
        ...oldEmbed,
        title: `~~${oldEmbed.title}~~ [${reasonText}]`,
        color: reason === 'COMPLETED' ? 0x10b981 : 0x6b7280, // Hijau jika selesai, Abu-abu jika dicabut
        footer: {
          text: `Team Wars Indonesia • Dicabut pada <t:${nowUnix}:R>`,
        },
      };

      // Patch pesan log lama tanpa merubah konten teks luar/structure
      await discordAPI(`/channels/${assignChannelId}/messages/${logMsgId}`, 'PATCH', {
        content: `~~⚖️ <@${oldStaffId}> ditugaskan sebagai **${roleTitle}**!~~ (Dicabut)`,
        embeds: [updatedEmbed],
      }).catch(() => null);
    }
  }

  const reasonLabel = reason === 'COMPLETED' ? 'Match Selesai' : 'Ganti Staff';

  return {
    type: 4,
    data: {
      content: `🗑️ **Unassign Berhasil!** Penugasan **${oldStaffName}** sebagai **${roleTitle}** pada match **${match.id}** resmi dicabut (${reasonLabel}). Opening embed channel match dan role/perms telah dibersihkan.`,
      flags: 64,
    },
  };
        }
