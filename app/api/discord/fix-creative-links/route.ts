import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const channelId = DISCORD_CONFIG.CH_LOGO;

    // 1. Ambil 50-100 pesan terakhir dari Channel Creative
    const messages: any = await discordAPI(`/channels/${channelId}/messages?limit=20`, 'GET');

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Gagal mengambil pesan channel' }, { status: 500 });
    }

    let updatedCount = 0;

    // 2. Loop setiap pesan untuk mencari link logo yang bermasalah
    for (const msg of messages) {
      // Pastikan pesan berasal dari bot & punya Embed
      if (msg.embeds && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        let description = embed.description || '';

        // Cek jika description berisi link Markdown `[...](https://...)`
        if (description.includes('https://teamwars.web.id/logo/')) {
          // Pola Regex untuk menangkap URL logo di dalam Markdown link
          const newDescription = description.replace(
            /https:\/\/teamwars\.web\.id\/logo\/([^()\s]+)/g,
            (match, p1) => {
              // Jika URL kena query string atau penulisan /download yang salah
              let cleanPath = p1;
              
              // Hapus query string (?t=...)
              if (cleanPath.includes('?')) {
                cleanPath = cleanPath.split('?')[0];
              }
              // Hapus akhiran /download jika sudah ada yang double
              cleanPath = cleanPath.replace(/\/download/g, '');

              return `https://teamwars.web.id/logo/${cleanPath}/download`;
            }
          );

          // Jika ada perubahan pada link-nya, edit pesan tersebut via Discord API
          if (newDescription !== description) {
            const updatedEmbed = {
              ...embed,
              description: newDescription,
            };

            await discordAPI(`/channels/${channelId}/messages/${msg.id}`, 'PATCH', {
              embeds: [updatedEmbed],
            });

            updatedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui ${updatedCount} link di pesan Creative!`,
    });
  } catch (error: any) {
    console.error('Error fixing creative links:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
            }
