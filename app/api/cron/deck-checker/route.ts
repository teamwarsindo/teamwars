import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

const TRACKED_CHANNELS = [
  { id: '1532355472764440576', name: 'Team STAR' },
  { id: '1532355753535471827', name: 'Team CHAMP' },
];

const TARGET_DECK_PER_PLAYER = 2;
const TARGET_PLAYERS = 5;
const TARGET_TOTAL_DECKS = 10;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    const results = [];

    for (const channel of TRACKED_CHANNELS) {
      // Fetch 100 pesan terakhir
      const messages = await discordAPI(`/channels/${channel.id}/messages?limit=100`, 'GET');

      if (!Array.isArray(messages)) {
        results.push({ channel: channel.id, status: 'Failed', error: 'Gagal mengambil pesan channel' });
        continue;
      }

      const playerSubmissions = new Map<string, { username: string; deckCount: number; avatar: string; images: string[] }>();

      // Urutkan dari pesan lama ke baru
      const reversedMessages = [...messages].reverse();

      for (const msg of reversedMessages) {
        if (msg.author.bot) continue;

        // Ambil attachment berjenis gambar
        const imageAttachments = (msg.attachments || []).filter((att: any) =>
          att.content_type && att.content_type.startsWith('image/')
        );

        if (imageAttachments.length > 0) {
          const userId = msg.author.id;
          const username = msg.author.global_name || msg.author.username;
          const currentData = playerSubmissions.get(userId) || {
            username,
            deckCount: 0,
            avatar: msg.author.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${msg.author.avatar}.png` : '/logo.webp',
            images: [],
          };

          currentData.deckCount += imageAttachments.length;
          currentData.images.push(...imageAttachments.map((att: any) => att.url));
          playerSubmissions.set(userId, currentData);
        }
      }

      let totalDecksCollected = 0;
      const playerDetailsList: string[] = [];

      playerSubmissions.forEach((data) => {
        totalDecksCollected += data.deckCount;
        const isComplete = data.deckCount >= TARGET_DECK_PER_PLAYER;
        const icon = isComplete ? '✅' : '⚠️';
        playerDetailsList.push(
          `${icon} **${data.username}**: ${data.deckCount}/${TARGET_DECK_PER_PLAYER} Deck`
        );
      });

      const totalPlayersSubmitted = playerSubmissions.size;
      const isTeamComplete = totalDecksCollected >= TARGET_TOTAL_DECKS && totalPlayersSubmitted >= TARGET_PLAYERS;

      const playersArray = Array.from(playerSubmissions.entries()).map(([id, val]) => ({
        userId: id,
        ...val,
      }));

      // Simpan Data Terstruktur ke Vercel KV
      const kvData = {
        channelId: channel.id,
        teamName: channel.name,
        totalDecks: totalDecksCollected,
        totalPlayers: totalPlayersSubmitted,
        isComplete: isTeamComplete,
        players: playersArray,
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`deck_rekap:${channel.id}`, kvData);

      // Kirim/Update Message Embed di Discord
      const summaryEmbed = {
        title: `📊 REKAP SUBMISSION DECK — ${channel.name.toUpperCase()}`,
        color: isTeamComplete ? hexToDecimal('#00FF00') : hexToDecimal('#FFA500'),
        description: 
          `**Status Terkini:**\n` +
          `• Total Deck Terkumpul: **${totalDecksCollected} / ${TARGET_TOTAL_DECKS} Deck**\n` +
          `• Pemain Sudah Kirim: **${totalPlayersSubmitted} / ${TARGET_PLAYERS} Pemain**\n\n` +
          `**Detail Pemain:**\n` +
          (playerDetailsList.length > 0 ? playerDetailsList.join('\n') : '_Belum ada pemain yang mengirim gambar._'),
        footer: { text: 'Auto-Updated via TWI Cron System (Setiap 15 Menit)' },
        timestamp: new Date().toISOString(),
      };

      const rekapMsgId = await kv.get<string>(`msg_rekap:${channel.id}`);

      if (rekapMsgId) {
        await discordAPI(`/channels/${channel.id}/messages/${rekapMsgId}`, 'PATCH', {
          embeds: [summaryEmbed],
        }).catch(() => null);
      } else {
        const resRekap = await discordAPI(`/channels/${channel.id}/messages`, 'POST', {
          embeds: [summaryEmbed],
        });
        if (resRekap?.id) {
          await kv.set(`msg_rekap:${channel.id}`, resRekap.id);
        }
      }

      results.push({
        channel: channel.id,
        team: channel.name,
        totalDecks: totalDecksCollected,
        totalPlayers: totalPlayersSubmitted,
      });
    }

    return NextResponse.json({ success: true, executedAt: new Date().toISOString(), results });
  } catch (error) {
    console.error('Error Cron Deck Checker:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
