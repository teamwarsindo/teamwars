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
const INITIAL_CONTROL_TIME_MINUTES = 15;

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
    const deadlineMinutes = 19 * 60; // 19:00 WIB
    const matchKickoffMinutes = 20 * 60; // 20:00 WIB

    const isLateMode = currentTotalMinutes >= deadlineMinutes;
    const isClosedMode = currentTotalMinutes >= matchKickoffMinutes;

    const results = [];

    for (const channelId of TRACKED_CHANNEL_IDS) {
      const channelInfo = await discordAPI(`/channels/${channelId}`, 'GET');
      const rawChannelName = channelInfo?.name || 'Unknown Channel';
      const guildId = channelInfo?.guild_id;
      const teamName = normalizeChannelName(rawChannelName);

      let guildMembers: any[] = [];
      if (guildId) {
        try {
          guildMembers = (await discordAPI(`/guilds/${guildId}/members?limit=100`, 'GET')) || [];
        } catch (e) {}
      }

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

        // 🟢 HANYA PROSES PESAN YANG PUNYA GAMBAR
        const imageAttachments = (msg.attachments || []).filter(
          (att: any) => att.content_type && att.content_type.startsWith('image/')
        );

        if (imageAttachments.length === 0) continue;

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

        if (msgTotalMinutes >= matchKickoffMinutes) continue;

        // 🛑 CARI MENTION KHUSUS DI PESAN GAMBAR INI SAJA
        const targetUserIds: string[] = [];
        const content = msg.content || '';

        // 1. Tag Mention Official (<@ID>)
        const mentionRegex = /<@!?(\d+)>/g;
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          if (!targetUserIds.includes(match[1])) {
            targetUserIds.push(match[1]);
          }
        }

        // 2. Mention dari API jika Regex terlewat
        if (Array.isArray(msg.mentions)) {
          msg.mentions.forEach((u: any) => {
            if (!u.bot && !targetUserIds.includes(u.id)) {
              targetUserIds.push(u.id);
            }
          });
        }

        // 3. Match Nama Teks jika tidak ada Tag Mention sama sekali
        if (targetUserIds.length === 0 && content && guildMembers.length > 0) {
          const contentLower = content.toLowerCase();
          for (const member of guildMembers) {
            if (member.user?.bot) continue;
            const nick = (member.nick || '').toLowerCase();
            const globalName = (member.user?.global_name || '').toLowerCase();
            const username = (member.user?.username || '').toLowerCase();

            const isMatch =
              (nick && nick.length >= 3 && contentLower.includes(nick)) ||
              (globalName && globalName.length >= 3 && contentLower.includes(globalName)) ||
              (username && username.length >= 3 && contentLower.includes(username));

            if (isMatch && !targetUserIds.includes(member.user.id)) {
              targetUserIds.push(member.user.id);
            }
          }
        }

        // 4. Jika tidak ada siapapun yang di-mention di pesan gambar ini, baru berikan ke Author (Pengirim)
        if (targetUserIds.length === 0) {
          targetUserIds.push(msg.author.id);
        }

        // 🟢 BAGIKAN GAMBAR SECARA PRESISI (2 Gambar per Target User)
        const imageUrls = imageAttachments.map((att: any) => att.url as string);
        let imageIndex = 0;

        for (const userId of targetUserIds) {
          if (imageIndex >= imageUrls.length) break;

          let targetUser = msg.author;
          const memberData = guildMembers.find((m: any) => m.user?.id === userId);
          if (memberData?.user) {
            targetUser = memberData.user;
          }

          let displayName = memberData?.nick || targetUser.global_name || targetUser.username;

          const currentData = playerSubmissions.get(userId) || {
            username: displayName,
            deckCount: 0,
            avatar: targetUser.avatar
              ? `https://cdn.discordapp.com/avatars/${userId}/${targetUser.avatar}.png`
              : '/logo.webp',
            images: [] as string[],
            submittedAt: msg.timestamp,
          };

          currentData.username = displayName;

          // Ambil maksimal 2 gambar untuk user ini
          let addedForThisUser = 0;
          while (
            imageIndex < imageUrls.length &&
            currentData.deckCount < TARGET_DECK_PER_PLAYER &&
            addedForThisUser < TARGET_DECK_PER_PLAYER
          ) {
            currentData.images.push(imageUrls[imageIndex]);
            currentData.deckCount += 1;
            addedForThisUser += 1;
            imageIndex += 1;
          }

          currentData.submittedAt = msg.timestamp;
          playerSubmissions.set(userId, currentData);
        }
      }

      let totalDecksCollected = 0;
      const playerDetailsList: string[] = [];
      let totalPenaltyMinutes = 0;

      playerSubmissions.forEach((data) => {
        totalDecksCollected += data.deckCount;

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

      const penaltyList: string[] = [];

      if (totalPenaltyMinutes > 0) {
        penaltyList.push(`• ⌛ **Sisa Waktu Kontrol Tim:** ${remainingControlTime} Menit`);
      }

      if (isClosedMode && uncollectedDecks > 0) {
        penaltyList.push(`• ❌ **AUTO-LOSS:** ${uncollectedDecks} Slot Deck tidak dikumpulkan hingga Kick-Off!`);
      }

      let penaltyFieldText = penaltyList.length > 0 ? penaltyList.join('\n') : null;
      const isTeamComplete = totalDecksCollected >= TARGET_TOTAL_DECKS && totalPlayersSubmitted >= TARGET_PLAYERS;

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
        color:
          isClosedMode && uncollectedDecks > 0
            ? hexToDecimal('#FF0000')
            : isTeamComplete
            ? hexToDecimal('#00FF00')
            : hexToDecimal('#FFA500'),
        description: statusHeader,
        fields: embedFields,
        footer: { text: 'Team Wars Indonesia' },
        timestamp: new Date().toISOString(),
      };

      const oldMsgId = await kv.get<string>(`msg_rekap:${channelId}`);
      if (oldMsgId) {
        await discordAPI(`/channels/${channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
        await kv.del(`msg_rekap:${channelId}`);
      }

      const resRekap = await discordAPI(`/channels/${channelId}/messages`, 'POST', {
        embeds: [summaryEmbed],
      });

      if (resRekap?.id) {
        await kv.set(`msg_rekap:${channelId}`, resRekap.id);
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
