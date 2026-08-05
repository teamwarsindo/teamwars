import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!signature || !timestamp || !publicKey) {
      console.error('❌ Missing Header or DISCORD_PUBLIC_KEY in Vercel Env!');
      return new Response('Bad request signature', { status: 401 });
    }

    // Read raw body cleanly from cloned request
    const rawBody = await req.text();

    const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);

    if (!isValidRequest) {
      console.warn('⚠️ Request Discord rejected: Invalid signature!');
      return new Response('Invalid request signature', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // 1. DISCORD PING ACKNOWLEDGEMENT (Type 1)
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // 2. BUTTON INTERACTION HANDLER (Type 3)
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
          return NextResponse.json({ type: 4, data: { content: '❌ Data match tidak ditemukan.', flags: 64 } });
        }

        const isReferee = match.refereeDiscordId && match.refereeDiscordId === userId;
        if (!isAdmin && !isReferee) {
          return NextResponse.json({ type: 4, data: { content: '⚠️ Akses ditolak! Khusus Wasit bertugas atau Admin.', flags: 64 } });
        }

        const token = match.refereeToken || '';
        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
        const magicUrl = `${hostUrl}/tournament/match-input/${matchId}?token=${token}`;

        return NextResponse.json({
          type: 4,
          data: { content: `🔒 **Akses Match Report Console**\n🔗 ${magicUrl}`, flags: 64 },
        });
      }

      // --- REQUEST RESCHEDULE ---
      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');
        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 2);
        suggestedDate.setHours(20, 0, 0, 0);
        const suggestedIso = suggestedDate.toISOString();

        const formattedSuggestedWIB = suggestedDate.toLocaleDateString('id-ID', {
          weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: `📢 **PENGAJUAN RESCHEDULE MATCH**\n\nUsulan waktu baru:\n📅 **${formattedSuggestedWIB} WIB**\n\n*Konfirmasi dari Kapten Tim Lawan atau Admin:*`,
            components: [
              {
                type: 1,
                components: [
                  { type: 2, style: 3, label: 'Setujui Reschedule', custom_id: `btn_confirm_reschedule_${matchId}_${suggestedIso}`, emoji: { name: '✅' } },
                  { type: 2, style: 4, label: 'Tolak', custom_id: `btn_reject_reschedule_${matchId}`, emoji: { name: '❌' } },
                ],
              },
            ],
          },
        });
      }

      // --- CONFIRM RESCHEDULE ---
      if (customId.startsWith('btn_confirm_reschedule_')) {
        const [, , matchId, newDateIso] = customId.split('_');
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const matchIndex = schedules.findIndex((m) => m.id === matchId);

        if (matchIndex !== -1) {
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
          });

          return NextResponse.json({
            type: 4,
            data: { content: `🎉 **Reschedule Disetujui & Resmi Berubah!**` },
          });
        }
      }

      // --- REJECT RESCHEDULE ---
      if (customId.startsWith('btn_reject_reschedule_')) {
        return NextResponse.json({ type: 4, data: { content: '❌ **Pengajuan Reschedule Ditolak.**' } });
      }
    }

    return NextResponse.json({ type: 1 });
  } catch (err) {
    console.error('Discord API Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
