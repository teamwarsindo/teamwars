import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ai } from '@/lib/gemini';
import { discordAPI } from '@/lib/discord/utils';
// 🎯 Import ID Channel Exhibition dari config Discord kamu
import { DISCORD_CONFIG } from '@/lib/discord/config'; 

// Ambil Channel ID Exhibition dari file config
const EXHIBITION_CHANNEL_ID = DISCORD_CONFIG.channels.CH_EXHI;

export async function GET(req: Request) {
  try {
    // 🛡️ Security Check Header Cron
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!EXHIBITION_CHANNEL_ID) {
      return NextResponse.json({ error: 'EXHIBITION_CHANNEL_ID belum diset di lib/discord/config' }, { status: 400 });
    }

    // 1. Fetch 1 Pesan Terakhir di Channel Exhibition
    const messages = await discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages?limit=1`, 'GET');

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pesan ditemukan di channel exhibition' });
    }

    const lastMsg = messages[0];

    // 🛑 Rule 1: SKIP jika pesan berasal dari BOT (Mencegah Infinite Loop)
    if (lastMsg.author?.bot) {
      return NextResponse.json({ message: 'Pesan terakhir dikirim oleh Bot, di-skip.' });
    }

    // 🛑 Rule 2: SKIP jika pesan kosong (misal gambar/stiker tanpa teks)
    if (!lastMsg.content || lastMsg.content.trim() === '') {
      return NextResponse.json({ message: 'Pesan terakhir berupa media/stiker tanpa teks, di-skip.' });
    }

    // 🛑 Rule 3: CEK REDIS KV (Mencegah menjawab pesan lama yang sama berulang kali)
    const redisKey = `ai_replied:${EXHIBITION_CHANNEL_ID}`;
    const lastRepliedMsgId = await kv.get<string>(redisKey);

    if (lastRepliedMsgId === lastMsg.id) {
      return NextResponse.json({ message: 'Pesan terakhir sudah pernah dibalas sebelumnya. Tidak ada chat baru.' });
    }

    const username = lastMsg.author.username || 'User';
    const userMessage = lastMsg.content;

    // 🤖 2. Minta Gemini AI Merespons Pesan User
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Pesan dari user '${username}': "${userMessage}"`,
      config: {
        systemInstruction: 
          'Kamu adalah AI Admin/Bot ramah di channel exhibition turnamen esports. ' +
          'Tugasmu adalah menjawab atau merespons pesan/pertanyaan user dengan gaya bahasa yang santai, akrab, Gaul khas anak game/esports, dan natural dalam Bahasa Indonesia. ' +
          'Jika user bertanya, beri jawaban yang jelas & masuk akal. ' +
          'Jika user hanya menyapa atau ngobrol, balas dengan santai & ramah. ' +
          'Jawab maksimal 2-3 kalimat agar scannable dan tidak terlalu panjang.',
        temperature: 0.7,
      },
    });

    const aiReplyText = response.text;

    if (!aiReplyText) {
      return NextResponse.json({ error: 'Gemini AI tidak menghasilkan jawaban' }, { status: 500 });
    }

    // 💬 3. Kirim Balasan (Reply) Langsung ke Pesan User di Discord
    await discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages`, 'POST', {
      content: aiReplyText,
      message_reference: {
        message_id: lastMsg.id, // Direct Reply ke pesan user
      },
    });

    // 💾 4. SIMPAN ID PESAN KE REDIS KV agar tidak dibalas ulang di cron berikutnya
    await kv.set(redisKey, lastMsg.id);

    return NextResponse.json({
      success: true,
      userPrompt: userMessage,
      aiReply: aiReplyText,
      messageId: lastMsg.id
    });

  } catch (error) {
    console.error('Error Auto-Reply Gemini AI Exhibition:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
