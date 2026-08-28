import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Simpan discord:match_messages lengkap dengan flags
    await kv.hset('discord:match_messages', {
      'Match-25': {
        campA: {
          slug: 'final-chapter',
          channelId: '1531121265027584050',
          morningMsgId: '1542740913762205770',
          trackerMsgId: '1542740916014555157',
        },
        campB: {
          slug: 'licht-united',
          channelId: '1527305126375723138',
          morningMsgId: '1542740916522061925',
          trackerMsgId: '1542740918359298189',
        },
        briefingMsgId: null,
        campMorningSent: true,
        matchBriefingSent: false,
      },
      'match-27': {
        campA: {
          slug: 'supernova',
          channelId: '1526622237514530826',
          morningMsgId: '1542740919823106149',
          trackerMsgId: '1542740922079510530',
        },
        campB: {
          slug: 'true-god',
          channelId: '1531568843762307224',
          morningMsgId: '1542740922880630825',
          trackerMsgId: '1542740924617199688',
        },
        briefingMsgId: null,
        campMorningSent: true,
        matchBriefingSent: false,
      },
      'match-32': {
        campA: {
          slug: 'kings-united',
          channelId: '1528758778093109309',
          morningMsgId: '1542740925795803278',
          trackerMsgId: '1542740927385436243',
        },
        campB: {
          slug: 'ux-dino-rampage',
          channelId: '1526829440540086312',
          morningMsgId: '1542740928232693791',
          trackerMsgId: '1542740929960607766',
        },
        briefingMsgId: null,
        campMorningSent: true,
        matchBriefingSent: false,
      },
    });

    // 2. Mapping Cepat Channel Camp -> Match & Tim
    await Promise.all([
      kv.set('channel:camp:1531121265027584050', { matchId: 'Match-25', teamSlug: 'final-chapter' }),
      kv.set('channel:camp:1527305126375723138', { matchId: 'Match-25', teamSlug: 'licht-united' }),
      kv.set('channel:camp:1526622237514530826', { matchId: 'match-27', teamSlug: 'supernova' }),
      kv.set('channel:camp:1531568843762307224', { matchId: 'match-27', teamSlug: 'true-god' }),
      kv.set('channel:camp:1528758778093109309', { matchId: 'match-32', teamSlug: 'kings-united' }),
      kv.set('channel:camp:1526829440540086312', { matchId: 'match-32', teamSlug: 'ux-dino-rampage' }),
    ]);

    // 3. Inisialisasi Kerangka Match Report
    const matchesInit = [
      { id: 'Match-25', slugA: 'final-chapter', slugB: 'licht-united' },
      { id: 'match-27', slugA: 'supernova', slugB: 'true-god' },
      { id: 'match-32', slugA: 'kings-united', slugB: 'ux-dino-rampage' },
    ];

    for (const m of matchesInit) {
      const exists = await kv.get(`match:report:${m.id}`);
      if (!exists) {
        await kv.set(`match:report:${m.id}`, {
          matchId: m.id,
          week: 4,
          metadata: { date: '2026-08-28', streamPlatform: 'YouTube', streamer: '', judge: '', caster: '' },
          teamA: { slug: m.slugA, lineup: [], score: 0, repeatsUsed: 0 },
          teamB: { slug: m.slugB, lineup: [], score: 0, repeatsUsed: 0 },
          games: [],
          finalScore: { teamA: 0, teamB: 0 },
          winnerTeam: null,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Recovery seed executed successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
            }
