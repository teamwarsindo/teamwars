import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

const TRACKED_CHANNEL_IDS = [
  '1532355472764440576',
  '1532355753535471827',
];

const TARGET_DECK_PER_PLAYER = 2;
const TARGET_PLAYERS = 5;
const TARGET_TOTAL_DECKS = 10;
const INITIAL_CONTROL_TIME_MINUTES = 15; // Waktu Kontrol Awal 15 Menit

function normalizeChannelName(rawName: string): string {
  return rawName
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function GET(req: Request) {
  try {
    // 🕒 1. Pengecekan Waktu WIB
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat('id-ID', options);
    const parts = formatter.formatToParts(now);

    let currentHour = 0;
    let currentMinute = 0;

    parts.forEach((p) => {
      if (p.type === 'hour') currentHour = parseInt(p.value, 10);
      if (p.type === 'minute') currentMinute = parseInt(p.value, 10);
    });

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const deadlineMinutes = 19 * 60; // 19:00 WIB (Deadline Pengumpulkan)
    const matchKickoffMinutes = 20 * 60; // 20:00 WIB (Kick-Off / Close Submit)

    const isLateMode = currentTotalMinutes >= deadlineMinutes;
    const isClosedMode = currentTotalMinutes >= matchKickoffMinutes;

    const results = [];

    for (const channelId of TRACKED_CHANNEL_IDS) {
      // Fetch Detail Channel
      const channelInfo = await discordAPI(`/channels/${channelId}`, 'GET');
      const rawChannelName = channelInfo?.name || 'Unknown Channel';
      const teamName = normalizeChannelName(rawChannelName);

      // Fetch 100 Pesan Terakhir
      const messages = await discordAPI(`/channels/${channelId}/messages?limit=100`, 'GET');

      if (!Array.isArray(messages)) {
        results.push({ channel: channelId, team: teamName, status: 'Failed', error: 'Gagal mengambil pesan channel' });
        continue;
      }

      const playerSubmissions = new Map<
        string,
        { username: string; deckCount: number; avatar: string; images: string[]; submittedAt: string }
      >();

      const reversedMessages = [...messages].reverse();

      for (const msg of reversedMessages) {
        if (msg.author.bot) continue;

        const imageAttachments = (msg.attachments || []).filter(
          (att: any) => att.content_type && att.content_type.startsWith('image/')
        );

        if (imageAttachments.length > 0) {
          const msgDate = new Date(msg.timestamp);
          const msgFormatter = new Intl.DateTimeFormat('id-ID', options);
          const msgParts = msgFormatter.formatToParts(msgDate);
          let msgHour = 0;
          let msgMinute = 0;
          msgParts.forEach((p) => {
            if (p.type === 'hour') msgHour = parseInt(p.value, 10);
            if (p.type === 'minute') msgMinute = parseInt(p.value, 10);
          });
          const msgTotalMinutes = msgHour * 60 + msgMinute;

          // Abaikan gambar yang dikirim setelah Kick-Off (20:00 WIB)
          if (msgTotalMinutes >= matchKickoffMinutes) continue;

          const userId = msg.author.id;
          const displayName = msg.member?.nick || msg.author.global_name || msg.author.username;

          const currentData = playerSubmissions.get(userId) || {
            username: displayName,
            deckCount: 0,
            avatar: msg.author.avatar
              ? `https://cdn.discordapp.com/avatars/${userId}/${msg.author.avatar}.png`
              : '/logo.webp',
            images: [] as string[],
            submittedAt: msg.timestamp,
          };

          currentData.username = displayName;
          currentData.deckCount += imageAttachments.length;
          currentData.images.push(...imageAttachments.map((att: any) => att.url as string));
          currentData.submittedAt = msg.timestamp;

          playerSubmissions.set(userId, currentData);
        }
      }

      let totalDecksCollected = 0;
      const playerDetailsList: string[] = [];
      let totalPenaltyMinutes = 0;

      playerSubmissions.forEach((data) => {
        totalDecksCollected += data.deckCount;

        // Pengecekan Keterlambatan Kirim Pesan
        const msgDate = new Date(data.submittedAt);
        const msgFormatter = new Intl.DateTimeFormat('id-ID', options);
        const msgParts = msgFormatter.formatToParts(msgDate);
        let msgHour = 0;
        let msgMinute = 0;
        msgParts.forEach((p) => {
          if (p.type === 'hour') msgHour = parseInt(p.value, 10);
          if (p.type === 'minute') msgMinute = parseInt(p.value, 10);
        });
        const msgTotalMinutes = msgHour * 60 + msgMinute;

        const isPlayerLate = msgTotalMinutes >= deadlineMinutes;
        const isComplete = data.deckCount >= TARGET_DECK_PER_PLAYER;

        let statusTag = '';
        if (isPlayerLate) {
          // Potong 2 menit per deck yang terlambat
          const penalty = data.deckCount * 2;
          totalPenaltyMinutes += penalty;
          statusTag = ` ⚠️ *(Terlambat)*`;
        } else {
          statusTag = isComplete ? ' ✅' : '';
        }

        playerDetailsList.push(
          `• **${data.username}**: ${data.deckCount}/${TARGET_DECK_PER_PLAYER} Deck${statusTag}`
        );
      });

      const totalPlayersSubmitted = playerSubmissions.size;
      const uncollectedDecks = TARGET_TOTAL_DECKS - totalDecksCollected;
      const remainingControlTime = Math.max(0, INITIAL_CONTROL_TIME_MINUTES - totalPenaltyMinutes);

      // 2. Status Teks Header (Info Awal Waktu Kontrol 15 Menit)
      let statusHeader = 
        `⏱️ **Deadline:** 19:00 WIB | **Kick-Off:** 20:00 WIB\n` +
        `⏳ **Waktu Kontrol Awal Tim:** ${INITIAL_CONTROL_TIME_MINUTES} Menit\n\n`;

      if (isClosedMode) {
        statusHeader += `🔴 **SUBMISSION RESMI DITUTUP**\n`;
      } else if (isLateMode) {
        statusHeader += `⚠️ **LEWAT DEADLINE (Masa Sanksi Keterlambatan)**\n`;
      } else {
        statusHeader += `🟢 **DALAM MASA PENGUMPULAN DECK**\n`;
      }

      statusHeader +=
        `• Total Deck: **${totalDecksCollected} / ${TARGET_TOTAL_DECKS}**\n` +
        `• Total Pemain: **${totalPlayersSubmitted} / ${TARGET_PLAYERS}**\n`;

      // 3. Detail Sanksi & Langsung Tampilkan Sisa Waktu Kontrol
      const penaltyList: string[] = [];

      if (totalPenaltyMinutes > 0) {
        penaltyList.push(`• ⌛ **Sisa Waktu Kontrol Tim:** ${remainingControlTime} Menit`);
      }

      if (isClosedMode && uncollectedDecks > 0) {
        penaltyList.push(`• ❌ **AUTO-LOSS:** ${uncollectedDecks} Slot Deck tidak dikumpulkan hingga Kick-Off!`);
      }

      let penaltyFieldText = penaltyList.length > 0 ? penaltyList.join('\n') : null;

      const isTeamComplete = totalDecksCollected >= TARGET_TOTAL_DECKS && totalPlayersSubmitted >= TARGET_PLAYERS;

      // 4. Simpan ke Vercel KV
      const kvData = {
        channelId,
        teamName,
        totalDecks: totalDecksCollected,
        totalPlayers: totalPlayersSubmitted,
        isComplete: isTeamComplete,
        isClosed: isClosedMode,
        initialControlTime: INITIAL_CONTROL_TIME_MINUTES,
        totalPenaltyMinutes,
        remainingControlTime,
        uncollectedDecks: isClosedMode ? uncollectedDecks : 0,
        players: Array.from(playerSubmissions.entries()).map(([id, val]) => ({
          userId: id,
          ...val,
        })),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`deck_rekap:${channelId}`, kvData);

      // 5. Build Embed Discord
      const embedFields = [
        {
          name: 'Detail Pemain',
          value: playerDetailsList.length > 0 ? playerDetailsList.join('\n') : '_Belum ada yang mengirim deck._',
          inline: false,
        },
      ];

      if (penaltyFieldText) {
        embedFields.push({
          name: '🚨 SANKSI & WAKTU KONTROL',
          value: penaltyFieldText,
          inline: false,
        });
      }

      const summaryEmbed = {
        title: `📊 REKAP SUBMISSION DECK`,
        color: isClosedMode && uncollectedDecks > 0 
          ? hexToDecimal('#FF0000') 
          : isTeamComplete 
          ? hexToDecimal('#00FF00') 
          : hexToDecimal('#FFA500'),
        description: statusHeader,
        fields: embedFields,
        footer: { text: 'Team Wars Indonesia' },
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
        isClosed: isClosedMode,
        remainingControlTime,
      });
    }

    return NextResponse.json({ success: true, executedAt: new Date().toISOString(), results });
  } catch (error) {
    console.error('Error Cron Deck Checker:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
