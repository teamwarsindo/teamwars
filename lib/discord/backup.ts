import { v2 as cloudinary } from 'cloudinary';
import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

// Konfigurasi resmi
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface SavedChatLogItem {
  id: string;
  authorId: string;
  authorName: string;
  authorGlobalName: string;
  authorAvatar: string;
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

// Gunakan helper bawaan Cloudinary persis seperti sign-cloudinary & match report
async function uploadDiscordImageToCloudinary(imageUrl: string, public_id: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    console.warn('[BACKUP] CLOUDINARY_API_SECRET belum terpasang.');
    return imageUrl;
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`[BACKUP] Gagal fetch gambar Discord: ${imgRes.status}`);
      return imageUrl;
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/png';
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'match-logs';

    // 🟢 Pakai params & helper signature yang sama persis
    const paramsToSign = {
      timestamp,
      folder,
      public_id,
      overwrite: true,
      invalidate: true,
      format: "png",
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    const formData = new FormData();
    formData.append("file", dataUri);
    formData.append("api_key", process.env.CLOUDINARY_API_KEY!);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("public_id", public_id);
    formData.append("overwrite", "true");
    formData.append("invalidate", "true");
    formData.append("format", "png");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[CLOUDINARY UPLOAD ERROR]:", data.error?.message);
      return imageUrl;
    }

    return data.secure_url;
  } catch (err) {
    console.error('[BACKUP] Error upload Cloudinary:', err);
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

  // 1. Fetch info channel Discord
  let actualChannelName = `⚔️-${matchId}`;
  try {
    const channelData = await discordAPI(`/channels/${channelId}`, 'GET');
    if (channelData?.name) actualChannelName = channelData.name;
  } catch (e) {
    console.warn('[BACKUP] Gagal fetch info channel:', e);
  }

  // 2. Fetch Guild Roles
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

  // 4. Fetch detail member secara sekuensial
  const uniqueAuthorIds = Array.from(new Set(userMessages.map((m: any) => m.author.id)));
  const memberDetailsMap: Record<string, { nick?: string }> = {};

  for (const uId of uniqueAuthorIds) {
    try {
      const member = await discordAPI(`/guilds/${guildId}/members/${uId}`, 'GET');
      if (member) {
        memberDetailsMap[uId] = {
          nick: member.nick || member.user?.global_name || member.user?.username,
        };
      }
    } catch {
      // Abaikan jika tidak ditemukan
    }
  }

  // 5. Upload Bukti & Format Chat Logs
  const formattedLogs: SavedChatLogItem[] = [];

  for (const msg of userMessages) {
    const attachments: SavedChatLogItem['attachments'] = [];
    const authorId = msg.author.id;
    const memberInfo = memberDetailsMap[authorId];

    const authorDisplayName = memberInfo?.nick || msg.author.global_name || msg.author.username;

    // User Mentions
    const userMentions: Record<string, { name: string; color?: string }> = {};
    if (Array.isArray(msg.mentions)) {
      msg.mentions.forEach((u: any) => {
        const targetMember = memberDetailsMap[u.id];
        userMentions[u.id] = {
          name: targetMember?.nick || u.global_name || u.username,
        };
      });
    }

    // Role Mentions
    const roleMentions: Record<string, { name: string; color?: string }> = {};
    if (Array.isArray(msg.mention_roles)) {
      msg.mention_roles.forEach((rId: string) => {
        const r = guildRolesMap[rId];
        if (r) {
          roleMentions[rId] = { name: r.name, color: r.color };
        }
      });
    }

    // Upload Bukti Attachment (folder match-logs)
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      for (let i = 0; i < msg.attachments.length; i++) {
        const att = msg.attachments[i];
        const isImage = att.content_type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(att.filename);

        if (isImage) {
          const public_id = `w${week}_${matchId}_${msg.id}_${i}`;
          await uploadDiscordImageToCloudinary(att.url, public_id);

          const maskedUrl = `/match-logs/${public_id}.png`;
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
      authorId,
      authorName: msg.author.username,
      authorGlobalName: authorDisplayName,
      authorAvatar: msg.author.avatar
        ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.webp?size=64`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
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
