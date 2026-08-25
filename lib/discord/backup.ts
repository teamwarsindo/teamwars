import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

export interface SavedChatLogItem {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  userMentions?: Record<string, string>; // Map: { "1401944...": "Asukaaa" }
  attachments: Array<{
    fileName: string;
    maskedUrl: string;
    contentType?: string;
  }>;
}

export async function backupDiscordChannelMessages(params: {
  channelId: string;
  matchId: string;
  week: number;
}): Promise<SavedChatLogItem[]> {
  const { channelId, matchId, week } = params;

  // 1. Fetch pesan dari Discord API
  const rawMessages = await discordAPI(`/channels/${channelId}/messages?limit=100`, 'GET');
  if (!Array.isArray(rawMessages)) {
    throw new Error('Gagal mengambil riwayat pesan dari Discord API');
  }

  // 2. Filter hanya pesan dari user (Kecualikan semua Bot)
  const userMessages = rawMessages.filter((msg: any) => !msg.author?.bot);

  const formattedLogs: SavedChatLogItem[] = [];

  for (const msg of userMessages) {
    const attachments: SavedChatLogItem['attachments'] = [];

    // Mapping mention user di dalam pesan
    const userMentions: Record<string, string> = {};
    if (Array.isArray(msg.mentions)) {
      msg.mentions.forEach((u: any) => {
        userMentions[u.id] = u.global_name || u.username;
      });
    }

    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      for (let i = 0; i < msg.attachments.length; i++) {
        const att = msg.attachments[i];
        const isImage = att.content_type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(att.filename);

        if (isImage) {
          const publicId = `bukti/match-logs/w${week}_${matchId}_${msg.id}_${i}`;
          // Masked URL web Next.js rewrites
          const maskedUrl = `/bukti/match-logs/w${week}_${matchId}_${msg.id}_${i}.png`;
          attachments.push({
            fileName: att.filename,
            maskedUrl,
            contentType: att.content_type,
          });
        }
      }
    }

    formattedLogs.push({
      id: msg.id,
      authorId: msg.author.id,
      authorName: msg.author.username,
      authorGlobalName: msg.author.global_name || msg.author.username,
      authorAvatar: msg.author.avatar
        ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.webp?size=64`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
      content: msg.content || '',
      timestamp: msg.timestamp,
      userMentions,
      attachments,
    });
  }

  return formattedLogs.reverse();
        }
