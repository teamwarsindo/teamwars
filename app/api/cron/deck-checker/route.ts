import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Cukup daftarkan Channel ID saja
const TRACKED_CHANNEL_IDS = [
  '1532355472764440576',
  '1532355753535471827',
];

const TARGET_DECK_PER_PLAYER = 2;
const TARGET_PLAYERS = 5;
const TARGET_TOTAL_DECKS = 10;

// 🟢 Helper Function: Normalisasi Nama Channel (e.g. "all-star-camp" -> "All Star Camp")
function normalizeChannelName(rawName: string): string {
  return rawName
    .replace(/[-_]/g, ' ') // Ganti dash (-) dan underscore (_) dengan spasi
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capital depan
    .join(' ');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    const results = [];

    for (const channelId of TRACKED_CHANNEL_IDS) {
      // 1. Ambil Detail Info Channel dari Discord API untuk Mendapatkan Nama Channel
      const channelInfo = await discordAPI(`/channels/${channelId}`, 'GET');
      const rawChannelName = channelInfo?.name || 'Unknown Channel';
      const teamName = normalizeChannelName(rawChannelName); // 👈 Hasil Normalisasi

      // 2. Fetch 100 Pesan Terakhir dari Channel
      const messages = await discordAPI(`/channels/${channelId}/messages?limit=100`, 'GET');

      if (!Array.isArray(messages)) {
        results.push({ channel: channelId, team: teamName, status: 'Failed', error: 'Gagal mengambil pesan channel' });
        continue;
      }

      const playerSubmissions = new Map<
        string,
        { username: string; deckCount: number; avatar: string; images: string[] }
      >();

      // Urutkan dari pesan lama ke baru
      const reversedMessages = [...messages].reverse();

      for (const msg of reversedMessages) {
        if (msg.author.bot) continue;

        // Ambil attachment berjenis gambar
        const imageAttachments = (msg.attachments || []).filter(
          (att: any) => att.content_type && att.content_type.startsWith('image/')
        );

        if (imageAttachments.length > 0) {
          const userId = msg.author.id;
          const username = msg.author.global_name || msg.author.username;

          const currentData = playerSubmissions.get(userId) || {
            username,
            deckCount: 0,
            avatar: msg.author.avatar
              ? `https://cdn.discordapp.com/avatars/${userId}/${msg.author.avatar}.png`
              : '/logo.webp',
            images: [] as string[],
          };

          currentData.deckCount += imageAttachments.length;
          currentData.images.push(...imageAttachments.map((att: any) => att.url as string));
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

      // 3. Simpan Data ke Vercel KV dengan Nama Tim yang Sudah Dinormalisasi
      const kvData = {
        channelId,
        teamName, // 👈 Contoh: "All Star Camp"
        totalDecks: totalDecksCollected,
        totalPlayers: totalPlayersSubmitted,
        isComplete: isTeamComplete,
        players: playersArray,
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`deck_rekap:${channelId}`, kvData);

      // 4. Kirim/Update Message Embed di Discord
      const summaryEmbed = {
        title: `📊 REKAP SUBMISSION DECK — ${teamName.toUpperCase()}`,
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

      const rekapMsgId = await kv.get<string>(`msg_rekap:${channelId}`);

      if (rekapMsgId) {
        await discordAPI(`/channels/${channelId}/messages/${rekapMsgId}`, 'PATCH', {
          embeds: [summaryEmbed],
        }).catch(() => null);
      } else {
        const resRekap = await discordAPI(`/channels/${channelId}/messages`, 'POST', {
          embeds: [summaryEmbed],
        });
        if (resRekap?.id) {
          await kv.set(`msg_rekap:${channelId}`, resRekap.id);
        }
      }

      results.push({
        channel: channelId,
        team: teamName,
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
                              
