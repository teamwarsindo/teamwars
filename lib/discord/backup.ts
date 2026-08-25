import { v2 as cloudinary } from 'cloudinary';
import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dhplw8rsd',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface SavedChatLogItem {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorRoles: string[];
  authorAvatar: string;
  content: string;
  timestamp: string;
  userMentions?: Record<string, { name: string; color?: string }>;
  roleMentions?: Record<string, { name: string; color?: string }>;
  channelMentions?: Record<string, { name: string }>;
  replyTo?: {
    id: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    hasAttachment?: boolean;
  };
  forwarded?: {
    content?: string;
    attachments: Array<{
      fileName: string;
      maskedUrl: string;
      contentType?: string;
    }>;
  };
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

async function ensureMatchLogsFolderExists(): Promise<void> {
  try {
    await cloudinary.api.create_folder('match-logs');
  } catch (err: any) {
    // folder already exists
  }
}

async function uploadDiscordImageToCloudinary(imageUrl: string, public_id: string): Promise<string> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return imageUrl;

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/png';
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const res = await cloudinary.uploader.upload(dataUri, {
      folder: 'match-logs',
      asset_folder: 'match-logs',
      public_id: public_id,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });

    return res.secure_url;
  } catch (err: any) {
    console.error('[CLOUDINARY ERROR]:', err?.message || err);
    return imageUrl;
  }
}

export async function backupDiscordChannelMessages(params: {
  channelId: string;
  matchId: string;
  week: number;
}): Promise<BackupResult> {
  const { channelId, matchId, week } = params;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  await ensureMatchLogsFolderExists();

  let actualChannelName = `⚔️-${matchId}`;
  try {
    const channelData = await discordAPI(`/channels/${channelId}`, 'GET');
    if (channelData?.name) actualChannelName = channelData.name;
  } catch (e) {
    console.warn('[BACKUP] Gagal fetch info channel:', e);
  }

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
    console.warn('[BACKUP] Gagal fetch roles:', err);
  }

  let allMessages: any[] = [];
  let lastId: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const url = lastId
      ? `/channels/${channelId}/messages?limit=100&before=${lastId}`
      : `/channels/${channelId}/messages?limit=100`;

    const batch = await discordAPI(url, 'GET');
    if (!Array.isArray(batch) || batch.length === 0) {
      hasMore = false;
      break;
    }

    allMessages.push(...batch);
    lastId = batch[batch.length - 1].id;
    if (batch.length < 100) hasMore = false;
  }

  const userMessages = allMessages.filter((msg: any) => !msg.author?.bot);

  const uniqueAuthorIds = Array.from(new Set(userMessages.map((m: any) => m.author.id)));
  const memberDetailsMap: Record<string, { nick?: string; roles: string[] }> = {};

  for (const uId of uniqueAuthorIds) {
    try {
      const member = await discordAPI(`/guilds/${guildId}/members/${uId}`, 'GET');
      if (member) {
        memberDetailsMap[uId] = {
          nick: member.nick || member.user?.global_name || member.user?.username,
          roles: Array.isArray(member.roles) ? member.roles : [],
        };
      }
    } catch {}
  }

  const formattedLogs: SavedChatLogItem[] = [];

  for (const msg of userMessages) {
    const attachments: SavedChatLogItem['attachments'] = [];
    const authorId = msg.author.id;
    const memberInfo = memberDetailsMap[authorId];

    const authorDisplayName = memberInfo?.nick || msg.author.global_name || msg.author.username;
    const authorRoles = memberInfo?.roles || [];

    // Mentions
    const userMentions: Record<string, { name: string; color?: string }> = {};
    if (Array.isArray(msg.mentions)) {
      msg.mentions.forEach((u: any) => {
        const targetMember = memberDetailsMap[u.id];
        userMentions[u.id] = {
          name: targetMember?.nick || u.global_name || u.username,
        };
      });
    }

    const roleMentions: Record<string, { name: string; color?: string }> = {};
    if (Array.isArray(msg.mention_roles)) {
      msg.mention_roles.forEach((rId: string) => {
        const r = guildRolesMap[rId];
        if (r) roleMentions[rId] = { name: r.name, color: r.color };
      });
    }

    // 1. Deteksi Reply
    let replyTo: SavedChatLogItem['replyTo'] = undefined;
    if (msg.referenced_message) {
      const ref = msg.referenced_message;
      const refMember = memberDetailsMap[ref.author?.id];
      replyTo = {
        id: ref.id,
        authorName: refMember?.nick || ref.author?.global_name || ref.author?.username || 'User',
        authorAvatar: ref.author?.avatar
          ? `https://cdn.discordapp.com/avatars/${ref.author.id}/${ref.author.avatar}.webp?size=32`
          : undefined,
        content: ref.content || '',
        hasAttachment: Boolean(ref.attachments && ref.attachments.length > 0),
      };
    }

    // 2. Deteksi Forwarded (message_snapshots)
    let forwarded: SavedChatLogItem['forwarded'] = undefined;
    if (Array.isArray(msg.message_snapshots) && msg.message_snapshots.length > 0) {
      const snap = msg.message_snapshots[0]?.message;
      if (snap) {
        const snapAttachments: SavedChatLogItem['attachments'] = [];
        if (Array.isArray(snap.attachments) && snap.attachments.length > 0) {
          for (let f = 0; f < snap.attachments.length; f++) {
            const fAtt = snap.attachments[f];
            const isImg = fAtt.content_type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fAtt.filename);
            if (isImg) {
              const public_id = `w${week}_${matchId}_fwd_${msg.id}_${f}`;
              await uploadDiscordImageToCloudinary(fAtt.url, public_id);
              snapAttachments.push({
                fileName: fAtt.filename,
                maskedUrl: `/match-logs/${public_id}.png`,
                contentType: fAtt.content_type,
              });
            }
          }
        }
        forwarded = {
          content: snap.content || '',
          attachments: snapAttachments,
        };
      }
    }

    // 3. Upload Attachment Utama
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      for (let i = 0; i < msg.attachments.length; i++) {
        const att = msg.attachments[i];
        const isImage = att.content_type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(att.filename);

        if (isImage) {
          const public_id = `w${week}_${matchId}_${msg.id}_${i}`;
          await uploadDiscordImageToCloudinary(att.url, public_id);

          attachments.push({
            fileName: att.filename,
            maskedUrl: `/match-logs/${public_id}.png`,
            contentType: att.content_type,
          });
        }
      }
    }

    formattedLogs.push({
      id: msg.id,
      authorId,
      authorName: msg.author.username,
      authorGlobalName: authorDisplayName,
      authorRoles,
      authorAvatar: msg.author.avatar
        ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.webp?size=64`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
      content: msg.content || '',
      timestamp: msg.timestamp,
      userMentions,
      roleMentions,
      replyTo,
      forwarded,
      attachments,
    });
  }

  return {
    channelName: actualChannelName,
    messages: formattedLogs.reverse(),
  };
         }
