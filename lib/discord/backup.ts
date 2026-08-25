import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

export interface SavedChatLogItem {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorAvatar: string;
  authorColor?: string; // Warna role tertinggi pengirim
  content: string;
  timestamp: string;
  userMentions?: Record<string, { name: string; color?: string }>;
  roleMentions?: Record<string, { name: string; color?: string }>;
  attachments: Array<{
    fileName: string;
    maskedUrl: string;
    contentType?: string;
  }>;
}

export interface BackupResult {
  channelName: string;
  messages: SavedChatLogItem[];
}

export async function backupDiscordChannelMessages(params: {
  channelId: string;
  matchId: string;
  week: number;
}): Promise<BackupResult> {
  const { channelId, matchId, week } = params;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  // 1. Ambil Nama Asli Channel dari Discord API
  let actualChannelName = `⚔️-${matchId}`;
  try {
    const channelData = await discordAPI(`/channels/${channelId}`, 'GET');
    if (channelData?.name) {
      actualChannelName = channelData.name;
    }
  } catch (e) {
    console.warn('[BACKUP] Gagal fetch info channel:', e);
  }

  // 2. Fetch seluruh Roles dari Guild beserta warnanya
  const guildRolesMap: Record<string, { name: string; color?: string; position: number }> = {};
  try {
    const rolesData = await discordAPI(`/guilds/${guildId}/roles`, 'GET');
    if (Array.isArray(rolesData)) {
      rolesData.forEach((r: any) => {
        const hex = r.color && r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : undefined;
        guildRolesMap[r.id] = { name: r.name, color: hex, position: r.position || 0 };
      });
    }
  } catch (err) {
    console.warn('[BACKUP] Gagal fetch guild roles:', err);
  }

  // 3. Fetch Pesan Channel
  const rawMessages = await discordAPI(`/channels/${channelId}/messages?limit=100`, 'GET');
  if (!Array.isArray(rawMessages)) {
    throw new Error('Gagal mengambil riwayat pesan dari Discord API');
  }

  const userMessages = rawMessages.filter((msg: any) => !msg.author?.bot);
  const formattedLogs: SavedChatLogItem[] = [];

  for (const msg of userMessages) {
    const attachments: SavedChatLogItem['attachments'] = [];

    // Cari warna role pengirim pesan
    let authorColor: string | undefined;
    if (msg.member?.roles && Array.isArray(msg.member.roles)) {
      let topPos = -1;
      for (const rId of msg.member.roles) {
        const r = guildRolesMap[rId];
        if (r && r.color && r.position > topPos) {
          topPos = r.position;
          authorColor = r.color;
        }
      }
    }

    // Mapping User Mentions
    const userMentions: Record<string, { name: string; color?: string }> = {};
    if (Array.isArray(msg.mentions)) {
      msg.mentions.forEach((u: any) => {
        userMentions[u.id] = {
          name: u.global_name || u.username,
        };
      });
    }

    // Mapping Role Mentions
    const roleMentions: Record<string, { name: string; color?: string }> = {};
    if (Array.isArray(msg.mention_roles)) {
      msg.mention_roles.forEach((rId: string) => {
        const r = guildRolesMap[rId];
        if (r) {
          roleMentions[rId] = { name: r.name, color: r.color };
        }
      });
    }

    // Upload & Mask Bukti Gambar
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      for (let i = 0; i < msg.attachments.length; i++) {
        const att = msg.attachments[i];
        const isImage = att.content_type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(att.filename);

        if (isImage) {
          const publicId = `bukti/match-logs/w${week}_${matchId}_${msg.id}_${i}`;
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
      authorColor,
      content: msg.content || '',
      timestamp: msg.timestamp,
      userMentions,
      roleMentions,
      attachments,
    });
  }

  return {
    channelName: actualChannelName,
    messages: formattedLogs.reverse(),
  };
}
