import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ai } from '@/lib/gemini';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Ambil Channel ID Exhibition dari file config
const EXHIBITION_CHANNEL_ID = DISCORD_CONFIG.CH_EXHI;

export async function GET(req: Request) {
  try {
    // 🛡️ Parameter reset untuk menghapus cache KV Redis (misal: /api/cron/ai-exhibition?reset=true)
    const { searchParams } = new URL(req.url);
    const isReset = searchParams.get('reset') === 'true';

    if (!EXHIBITION_CHANNEL_ID) {
      return NextResponse.json({ error: 'EXHIBITION_CHANNEL_ID belum diset di DISCORD_CONFIG.channels.exhibition' }, { status: 400 });
    }

    const redisKey = `ai_replied:${EXHIBITION_CHANNEL_ID}`;

    if (isReset) {
      await kv.del(redisKey);
      return NextResponse.json({ success: true, message: 'Cache Redis berhasil di-reset!' });
    }

    // 1. Fetch 8 PESAN TERAKHIR di Channel Exhibition untuk Konteks Percakapan
    const rawMessages = await discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages?limit=8`, 'GET');

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pesan di channel exhibition' });
    }

    // Urutkan dari pesan lama ke baru (kronologis)
    const conversation = [...rawMessages].reverse();
    const lastMsg = rawMessages[0]; // Pesan paling baru (terakhir)

    // 🛑 Rule 1: Skip jika pesan terakhir dikirim oleh Bot
    if (lastMsg.author?.bot) {
      return NextResponse.json({ message: 'Pesan terakhir dikirim oleh Bot, di-skip.' });
    }

    // 🛑 Rule 2: Skip jika teks kosong (misal gambar/stiker)
    if (!lastMsg.content || lastMsg.content.trim() === '') {
      return NextResponse.json({ message: 'Pesan berupa media/stiker, di-skip.' });
    }

    // 🛑 Rule 3: Anti-Spam Redis (Cek apakah pesan ID ini sudah pernah dibalas)
    const lastRepliedMsgId = await kv.get<string>(redisKey);
    if (lastRepliedMsgId === lastMsg.id) {
      return NextResponse.json({ message: 'Pesan ini sudah dibalas sebelumnya.' });
    }

    // 🧠 2. Rakit Riwayat Chat sebagai Konteks Pembelajaran AI
    const formattedHistory = conversation.map((msg) => {
      const role = msg.author?.bot ? 'Bot' : msg.author?.username || 'User';
      return `${role}: ${msg.content}`;
    }).join('\n');

    const promptText = `Berikut adalah riwayat percakapan terbaru di chat room:\n${formattedHistory}\n\n` +
      `Tolong berikan balasan singkat untuk pesan TERAKHIR dari ${lastMsg.author?.username}: "${lastMsg.content}"`;

    // 🤖 3. Generate Balasan Gemini AI
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: promptText,
      config: {
        systemInstruction:
          'Kamu adalah member/anak Discord biasa di server esports/gaming Indonesia yang santai, rada sarkas, agak pinggir jurang/dark joke khas tongkrongan netizen lokal, cuek, tapi tetep akrab.\n\n' +
          'ATURAN PENTING GAYA BAHASA:\n' +
          '1. JANGAN PERNAH pakai kata "bro", "wkwk" di awal kalimat, "halo", "semangat", atau gaya bahasa CS/Admin AI yang ramah lebay.\n' +
          '2. Jangan pakai emoji berlebihan (maksimal 1 atau gak usah pakai sama sekali).\n' +
          '3. Gunakan bahasa gaul harian/ketikan anak Discord lokal yang natural, singkat (1 kalimat pendek atau max 15 kata).\n' +
          '4. Jika bahas politik/isu Indonesia, boleh bercanda tipis ala "pinggir jurang" (sarkas/nyindir halus) tapi tetap dalam batas aman.\n' +
          '5. Fokus membalas pesan terakhir dengan memperhatikan riwayat obrolan di atasnya.',
        temperature: 0.9,
      },
    });

    const aiReplyText = response.text?.trim();

    if (!aiReplyText) {
      return NextResponse.json({ error: 'Gemini AI tidak menghasilkan jawaban' }, { status: 500 });
    }

    // 💬 4. Kirim Direct Reply ke Pesan Terakhir di Discord
    await discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages`, 'POST', {
      content: aiReplyText,
      message_reference: {
        message_id: lastMsg.id, // Menempelkan balasan langsung (seperti screenshot)
      },
      allowed_mentions: {
        replied_user: false
      }
    });

    // 💾 5. Simpan ID Pesan ke Redis KV
    await kv.set(redisKey, lastMsg.id);

    return NextResponse.json({
      success: true,
      userPrompt: lastMsg.content,
      aiReply: aiReplyText,
      messageId: lastMsg.id
    });

  } catch (error) {
    console.error('Error Auto-Reply Gemini AI Exhibition:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
