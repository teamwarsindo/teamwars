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
  attachments: Array<{
    fileName: string;
    maskedUrl: string;
    contentType?: string;
  }>;
}

// Upload buffer/stream ke Cloudinary REST API tanpa library berat
async function uploadToCloudinary(fileUrl: string, publicId: string): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dhplw8rsd';
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn('[BACKUP] Cloudinary API Key/Secret belum diset, menyimpan URL asli');
    return fileUrl;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const formData = new FormData();
    formData.append('file', fileUrl);
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error('[CLOUDINARY ERROR]:', await res.text());
      return fileUrl;
    }

    const json = await res.json();
    return json.secure_url || fileUrl;
  } catch (err) {
    console.error('[CLOUDINARY UPLOAD FAILED]:', err);
    return fileUrl;
  }
}

export async function backupDiscordChannelMessages(params: {
  channelId: string;
  matchId: string;
  week: number;
}): Promise<SavedChatLogItem[]> {
  const { channelId, matchId, week } = params;

  // 1. Fetch pesan dari Discord API (100 pesan terakhir)
  const rawMessages = await discordAPI(`/channels/${channelId}/messages?limit=100`, 'GET');
  if (!Array.isArray(rawMessages)) {
    throw new Error('Gagal mengambil riwayat pesan dari Discord API');
  }

  // 2. Filter hanya pesan dari user (Kecualikan semua Bot)
  const userMessages = rawMessages.filter((msg: any) => !msg.author?.bot);

  // 3. Proses attachments & upload bukti gambar
  const formattedLogs: SavedChatLogItem[] = [];

  for (const msg of userMessages) {
    const attachments: SavedChatLogItem['attachments'] = [];

    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      for (let i = 0; i < msg.attachments.length; i++) {
        const att = msg.attachments[i];
        const isImage = att.content_type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(att.filename);

        if (isImage) {
          const publicId = `bukti/match-logs/w${week}_${matchId}_${msg.id}_${i}`;
          await uploadToCloudinary(att.url, publicId);

          // Gunakan masked URL sesuai Next.js rewrites (/bukti/:path*)
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
      attachments,
    });
  }

  // Balikkan urutan agar kronologis dari pesan awal ke akhir
  return formattedLogs.reverse();
      }
