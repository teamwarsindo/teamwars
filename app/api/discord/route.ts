import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { revalidatePath } from 'next/cache';

function validateRescheduleSlot(targetDateStr: string, schedules: any[], currentMatchId: string) {
  const targetDate = new Date(targetDateStr);
  const dayOfWeek = targetDate.getDay();

  const allowedDays = [0, 3, 4, 5, 6]; // Rabu - Minggu
  if (!allowedDays.includes(dayOfWeek)) {
    return { valid: false, reason: 'Reschedule hanya diperbolehkan untuk hari Rabu s/d Minggu!' };
  }

  const targetDateISO = targetDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const matchCount = schedules.filter((m) => {
    if (m.id === currentMatchId) return false;
    const mDateISO = new Date(m.matchDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    return mDateISO === targetDateISO;
  }).length;

  if (matchCount >= 3) {
    return { valid: false, reason: 'Kuota pertandingan di hari tersebut sudah penuh (Maksimal 3 Match/Hari)!' };
  }

  return { valid: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === 3) {
      const customId: string = body.data?.custom_id || '';
      const userId: string = body.member?.user?.id || '';
      const userRoles: string[] = body.member?.roles || [];
      const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

      // 1. EDIT MATCH REPORT (MAGIC LINK TOKEN REAL)
      if (customId.startsWith('btn_edit_match_')) {
        const matchId = customId.replace('btn_edit_match_', '');

        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const match = schedules.find((m) => m.id === matchId);

        if (!match) {
          return NextResponse.json({
            type: 4,
            data: { content: '❌ Data pertandingan tidak ditemukan.', flags: 64 },
          });
        }

        const isReferee = match.refereeDiscordId && match.refereeDiscordId === userId;
        if (!isAdmin && !isReferee) {
          return NextResponse.json({
            type: 4,
            data: { content: '⚠️ **Akses Ditolak!** Tombol ini khusus Wasit bertugas atau Admin.', flags: 64 },
          });
        }

        const token = match.refereeToken || '';
        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
        const magicUrl = `${hostUrl}/tournament/match-input/${matchId}?token=${token}`;

        return NextResponse.json({
          type: 4,
          data: {
            content: `🔒 **Akses Match Report Console (${match.teamAName} vs ${match.teamBName})**\n\nSilakan klik link berikut untuk menginput skor:\n🔗 ${magicUrl}\n\n*(Link ini bersifat rahasia)*`,
            flags: 64, // Ephemeral
          },
        });
      }

      // 2. REQUEST RESCHEDULE
      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');

        return NextResponse.json({
          type: 4,
          data: {
            content: `📅 **Ketentuan Reschedule Pertandingan**\n\n1. Diskusikan jadwal baru bersama tim lawan.\n2. Hari diperbolehkan: **Rabu s/d Minggu** (Maks **3 Match/Hari**).\n3. Sepakati waktu baru lalu konfirmasikan ke **Admin Tournament** untuk update resmi.`,
            flags: 64,
          },
        });
      }

      // 3. CONFIRM RESCHEDULE (UPDATE KV REDIS + REVALIDATE WEB)
      if (customId.startsWith('btn_confirm_reschedule_')) {
        const [, , matchId, newDateIso] = customId.split('_');

        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const matchIndex = schedules.findIndex((m) => m.id === matchId);

        if (matchIndex === -1) {
          return NextResponse.json({ type: 4, data: { content: '❌ Data match tidak ditemukan.', flags: 64 } });
        }

        const slotValidation = validateRescheduleSlot(newDateIso, schedules, matchId);
        if (!slotValidation.valid) {
          return NextResponse.json({ type: 4, data: { content: `⚠️ **Reschedule Gagal:** ${slotValidation.reason}`, flags: 64 } });
        }

        // 🟢 UPDATE DATABASE REDIS
        schedules[matchIndex].matchDate = newDateIso;
        await kv.set('twi:schedules', schedules);

        // 🟢 REVALIDATE TAMPILAN WEB INSTAN
        revalidatePath('/tournament');
        revalidatePath('/admin/dashboard');

        // SYNC EMBED DISCORD
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
          isSync: true,
        });

        const formattedDateWIB = new Date(newDateIso).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: `🎉 **Reschedule Disetujui & Resmi Berubah!**\nJadwal **${match.teamAName} vs ${match.teamBName}** telah diperbarui di Website & Discord menjadi:\n📅 **${formattedDateWIB} WIB**.`,
          },
        });
      }
    }

    return NextResponse.json({ type: 1 });
  } catch (err) {
    console.error('Discord API Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}