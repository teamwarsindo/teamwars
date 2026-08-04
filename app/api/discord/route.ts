import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { revalidatePath } from 'next/cache';
import nacl from 'tweetnacl';

// Helper Verifikasi Signature ED25519 Standar Discord (Menggunakan Uint8Array)
function verifyDiscordSignature(rawBody: string, signature: string | null, timestamp: string | null, publicKey: string | undefined): boolean {
  if (!signature || !timestamp || !publicKey) return false;

  try {
    const signatureBuffer = HexToUint8Array(signature);
    const publicKeyBuffer = HexToUint8Array(publicKey);
    const messageBuffer = new TextEncoder().encode(timestamp + rawBody);

    return nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKeyBuffer);
  } catch (e) {
    console.error('Signature verification exception:', e);
    return false;
  }
}

// Helper konversi String Hex ke Uint8Array
function HexToUint8Array(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
}

function validateRescheduleSlot(targetDateStr: string, schedules: any[], currentMatchId: string) {
  const targetDate = new Date(targetDateStr);
  const dayOfWeek = targetDate.getDay();

  const allowedDays = [0, 3, 4, 5, 6]; // Rabu - Minggu
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
    // 🟢 1. VERIFIKASI DISCORD INTERACTION SIGNATURE HEADER
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    const rawBody = await req.text();
    const isValidRequest = verifyDiscordSignature(rawBody, signature, timestamp, publicKey);

    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    // 🟢 2. PARSE BODY INTERACTION
    const body = JSON.parse(rawBody);

    // 🟢 3. RESPONSE PING (Wajib untuk Verifikasi Discord Portal)
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // 🟢 4. HANDLER TOMBOL DISCORD (Type 3 = Message Component)
    if (body.type === 3) {
      const customId: string = body.data?.custom_id || '';
      const userId: string = body.member?.user?.id || '';
      const userRoles: string[] = body.member?.roles || [];
      const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

      // --- EDIT MATCH REPORT ---
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

      // --- REQUEST RESCHEDULE ---
      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const match = schedules.find((m) => m.id === matchId);

        if (!match) {
          return NextResponse.json({
            type: 4,
            data: { content: '❌ Match tidak ditemukan.', flags: 64 },
          });
        }

        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 2);
        suggestedDate.setHours(20, 0, 0, 0);
        const suggestedIso = suggestedDate.toISOString();

        const formattedSuggestedWIB = suggestedDate.toLocaleDateString('id-ID', {
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
            content: `📢 **PENGAJUAN RESCHEDULE MATCH**\n\n` +
              `Salah satu tim mengusulkan perubahan jadwal tanding menjadi:\n` +
              `📅 **${formattedSuggestedWIB} WIB**\n\n` +
              `*Mohon konfirmasi persetujuan dari Kapten Tim Lawan atau Admin Tournament:*`,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 3,
                    label: 'Setujui Reschedule',
                    custom_id: `btn_confirm_reschedule_${matchId}_${suggestedIso}`,
                    emoji: { name: '✅' },
                  },
                  {
                    type: 2,
                    style: 4,
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

      // --- CONFIRM RESCHEDULE ---
      if (customId.startsWith('btn_confirm_reschedule_')) {
        const parts = customId.split('_');
        const matchId = parts[2];
        const newDateIso = parts[3];

        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const matchIndex = schedules.findIndex((m) => m.id === matchId);

        if (matchIndex === -1) {
          return NextResponse.json({ type: 4, data: { content: '❌ Data match tidak ditemukan.', flags: 64 } });
        }

        const slotValidation = validateRescheduleSlot(newDateIso, schedules, matchId);
        if (!slotValidation.valid) {
          return NextResponse.json({ type: 4, data: { content: `⚠️ **Reschedule Gagal:** ${slotValidation.reason}`, flags: 64 } });
        }

        schedules[matchIndex].matchDate = newDateIso;
        await kv.set('twi:schedules', schedules);

        revalidatePath('/tournament');
        revalidatePath('/admin/dashboard');

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

      // --- REJECT RESCHEDULE ---
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
    return new Response('Internal Server Error', { status: 500 });
  }
}