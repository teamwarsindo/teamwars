import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { revalidatePath } from 'next/cache';

function validateRescheduleSlot(targetDateStr: string, schedules: any[], currentMatchId: string) {
  const targetDate = new Date(targetDateStr);
  const dayOfWeek = targetDate.getDay(); // 0 = Minggu, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu

  const allowedDays = [0, 3, 4, 5, 6];
  if (!allowedDays.includes(dayOfWeek)) {
    return { valid: false, reason: 'Reschedule HANYA diperbolehkan untuk hari Rabu s/d Minggu!' };
  }

  const targetDateISO = targetDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const matchCount = schedules.filter((m) => {
    if (m.id === currentMatchId) return false;
    const mDateISO = new Date(m.matchDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    return mDateISO === targetDateISO;
  }).length;

  if (matchCount >= 3) {
    return { valid: false, reason: 'Kuota hari tersebut sudah penuh (Maksimal 3 Match/Hari)!' };
  }

  return { valid: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 🟢 INTERACTION HANDLER (Button & Select Menu)
    if (body.type === 3) {
      const customId: string = body.data?.custom_id || '';
      const userId: string = body.member?.user?.id || '';
      const userRoles: string[] = body.member?.roles || [];
      const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

      // 1. CLICK EDIT MATCH REPORT
      if (customId.startsWith('btn_edit_match_')) {
        const matchId = customId.replace('btn_edit_match_', '');
        const isTesting = matchId === 'match-test';

        let token = 'test-token-123';
        if (!isTesting) {
          const schedules = (await kv.get<any[]>('twi:schedules')) || [];
          const match = schedules.find((m) => m.id === matchId);
          if (!match) return NextResponse.json({ type: 4, data: { content: '❌ Match tidak ditemukan.', flags: 64 } });
          token = match.refereeToken || '';
        }

        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
        const magicUrl = `${hostUrl}/tournament/match-input/${matchId}?token=${token}`;

        return NextResponse.json({
          type: 4,
          data: {
            content: `🔒 **Console WASIT Match Report**\n🔗 Klik link berikut: ${magicUrl}`,
            flags: 64, // Ephemeral
          },
        });
      }

      // 2. CLICK AJUKAN RESCHEDULE (INTERAKTIF BUTTON KONFIRMASI)
      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');
        
        // Simulasikan Tanggal Reschedule (Contoh: Sabtu Jam 20.00 WIB)
        const sampleTargetDate = new Date();
        sampleTargetDate.setDate(sampleTargetDate.getDate() + 2);
        sampleTargetDate.setHours(20, 0, 0, 0);
        const targetIso = sampleTargetDate.toISOString();

        return NextResponse.json({
          type: 4,
          data: {
            content: `📢 **PENGAJUAN RESCHEDULE MATCH**\n\n` +
              `Tim pengaju mengusulkan jadwal tanding baru menjadi:\n` +
              `📅 **${sampleTargetDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB**\n\n` +
              `*Membutuhkan persetujuan Kapten Tim Lawan atau Admin Tournament:*`,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 3, // Success (Green)
                    label: 'Setujui Reschedule',
                    custom_id: `btn_confirm_reschedule_${matchId}_${targetIso}`,
                    emoji: { name: '✅' },
                  },
                  {
                    type: 2,
                    style: 4, // Danger (Red)
                    label: 'Tolak',
                    custom_id: `btn_reject_reschedule_${matchId}`,
                    emoji: { name: '❌' },
                  },
                ],
              },
            ],
          },
        });
      }

      // 3. SETUJUI RESCHEDULE (UPDATE KV REDIS + WEB AUTOMATICALLY)
      if (customId.startsWith('btn_confirm_reschedule_')) {
        const parts = customId.split('_');
        const matchId = parts[2];
        const newDateIso = parts[3];
        const isTesting = matchId === 'match-test';

        if (isTesting) {
          return NextResponse.json({
            type: 4,
            data: {
              content: `🎉 **[TESTING RESCHEDULE BERHASIL]** Reschedule disetujui! Jadwal diperbarui ke **${new Date(newDateIso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB**.`,
            },
          });
        }

        // PRODUCTION: UPDATE DATABASE REDIS
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const matchIndex = schedules.findIndex((m) => m.id === matchId);

        if (matchIndex === -1) {
          return NextResponse.json({ type: 4, data: { content: '❌ Match tidak ditemukan di KV Redis.', flags: 64 } });
        }

        // Validasi Slot
        const checkSlot = validateRescheduleSlot(newDateIso, schedules, matchId);
        if (!checkSlot.valid) {
          return NextResponse.json({ type: 4, data: { content: `⚠️ **Gagal:** ${checkSlot.reason}`, flags: 64 } });
        }

        // 🟢 UPDATE DATA JADWAL
        schedules[matchIndex].matchDate = newDateIso;
        await kv.set('twi:schedules', schedules);

        // 🟢 REVALIDATE AGAR WEB ADMIN & PUBLIK LANGSUNG BERUBAH DETIK INI JUGA!
        revalidatePath('/tournament');
        revalidatePath('/admin/dashboard');

        // SYNC DISCORD EMBED
        const match = schedules[matchIndex];
        await createMatchDiscordChannel({
          matchId: match.id,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          weekName: `Week ${match.calculatedWeekNumber || 1}`,
          matchDateIso: match.matchDate,
          refereeName: match.referee,
          refereeDiscordId: match.refereeDiscordId,
          streamerName: match.streamer,
          streamerDiscordId: match.caster,
          streamLink: match.streamLink,
          isSync: true, // Tanpa Ping Role
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: `🎉 **Reschedule Disetujui & Resmi Berubah!**\nJadwal **${match.teamAName} vs ${match.teamBName}** otomatis telah diperbarui di Website & Discord!`,
          },
        });
      }

      if (customId.startsWith('btn_reject_reschedule_')) {
        return NextResponse.json({
          type: 4,
          data: { content: '❌ **Pengajuan Reschedule Ditolak.** Jadwal pertandingan tetap sesuai jadwal semula.' },
        });
      }
    }

    return NextResponse.json({ type: 1 });
  } catch (err) {
    console.error('Discord API Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
      }
