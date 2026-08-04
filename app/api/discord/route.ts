import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { revalidatePath } from 'next/cache';

// Helper Validasi Slot Hari (Rabu-Minggu & Maks 3 Match/Hari)
function validateRescheduleSlot(targetDateStr: string, schedules: any[], currentMatchId: string) {
  const targetDate = new Date(targetDateStr);
  const dayOfWeek = targetDate.getDay(); // 0 = Minggu, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu

  const allowedDays = [0, 3, 4, 5, 6];
  if (!allowedDays.includes(dayOfWeek)) {
    return { valid: false, reason: 'Reschedule hanya diperbolehkan untuk hari Rabu s/d Minggu!' };
  }

  // Hitung jumlah match di tanggal tersebut (selain match yang sedang di-reschedule)
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

    // 🟢 INTERACTION HANDLER (Button / Components)
    if (body.type === 3) {
      const customId: string = body.data?.custom_id || '';
      const userId: string = body.member?.user?.id || '';
      const userRoles: string[] = body.member?.roles || [];
      const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

      // ==========================================
      // 1. EDIT MATCH REPORT (MAGIC LINK WASIT)
      // ==========================================
      if (customId.startsWith('btn_edit_match_')) {
        const matchId = customId.replace('btn_edit_match_', '');
        const isTesting = matchId === 'match-test';

        let token = 'test-token-123';
        let matchName = 'Testing Team Alpha vs Testing Team Beta';

        if (!isTesting) {
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
              data: {
                content: '⚠️ **Akses Ditolak!** Tombol ini khusus Wasit bertugas atau Admin.',
                flags: 64,
              },
            });
          }

          token = match.refereeToken || '';
          matchName = `${match.teamAName} vs ${match.teamBName}`;
        }

        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
        const magicUrl = `${hostUrl}/tournament/match-input/${matchId}?token=${token}`;

        return NextResponse.json({
          type: 4,
          data: {
            content: `🔒 **Akses Match Report Console (${matchName})**\n\nSilakan klik link berikut untuk mengisi skor & statistik pertandingan:\n🔗 ${magicUrl}\n\n*(Link ini bersifat rahasia khusus Wasit/Admin)*${isTesting ? '\n\n🧪 **[SANDBOX MODE ACTIVE]**' : ''}`,
            flags: 64, // Ephemeral (Pesan Rahasia)
          },
        });
      }

      // ==========================================
      // 2. REQUEST RESCHEDULE
      // ==========================================
      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');
        const isTesting = matchId === 'match-test';

        return NextResponse.json({
          type: 4,
          data: {
            content: `📅 **Ketentuan Reschedule Pertandingan**\n\n` +
              `1. Diskusikan dan sepakati jadwal baru bersama tim lawan.\n` +
              `2. Jadwal yang diperbolehkan: **Hari Rabu s/d Minggu** (Maksimal **3 Match/Hari**).\n` +
              `3. Jika sudah menemukan kesepakatan fix, silakan laporkan ke **Admin Tournament** untuk pembaruan resmi di Website & Discord.${isTesting ? '\n\n🧪 **[SANDBOX MODE ACTIVE]**' : ''}`,
            flags: 64,
          },
        });
      }

      // ==========================================
      // 3. CONFIRM/APPROVE RESCHEDULE (UPDATE JADWAL WEB)
      // ==========================================
      if (customId.startsWith('btn_confirm_reschedule_')) {
        // Format Custom ID: btn_confirm_reschedule_[MATCH_ID]_[NEW_ISO_DATE]
        const parts = customId.split('_');
        const matchId = parts[2];
        const newDateIso = parts[3];
        const isTesting = matchId === 'match-test';

        if (isTesting) {
          return NextResponse.json({
            type: 4,
            data: {
              content: `🎉 **[TESTING RESCHEDULE SUCCESS]** Simulasi persetujuan jadwal baru berhasil! Jadwal diperbarui ke: **${new Date(newDateIso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB**. (Data KV Redis resmi tidak disentuh).`,
              flags: 64,
            },
          });
        }

        // --- PRODUCTION RESCHEDULE FLOW ---
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const matchIndex = schedules.findIndex((m) => m.id === matchId);

        if (matchIndex === -1) {
          return NextResponse.json({
            type: 4,
            data: { content: '❌ Data pertandingan tidak ditemukan di KV Redis.', flags: 64 },
          });
        }

        // Validasi Slot Hari & Kuota
        const slotValidation = validateRescheduleSlot(newDateIso, schedules, matchId);
        if (!slotValidation.valid) {
          return NextResponse.json({
            type: 4,
            data: { content: `⚠️ **Reschedule Gagal:** ${slotValidation.reason}`, flags: 64 },
          });
        }

        // 🟢 1. UPDATE DATA JADWAL DI DATABASE KV REDIS
        schedules[matchIndex].matchDate = newDateIso;
        await kv.set('twi:schedules', schedules);

        // 🟢 2. REVALIDATE PATH SUPAYA TAMPILAN JADWAL DI WEB PUBLIK & ADMIN LANGSUNG BERUBAH
        revalidatePath('/tournament');
        revalidatePath('/admin/dashboard');

        // 🟢 3. SYNC/UPDATE EMBED DISCORD DENGAN JADWAL BARU
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
          isSync: true, // Re-sync embed tanpa ping role ulang
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

    return NextResponse.json({ type: 1 }); // PING / PONG Discord Webhook
  } catch (err) {
    console.error('Discord Webhook Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
        }
