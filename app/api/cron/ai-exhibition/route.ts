import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ai } from '@/lib/gemini';
import { discordAPI } from '@/lib/discord/utils';
import { CH_EXHI } from '@/lib/discord/config';

export async function GET(req: Request) {
  try {
    // 🛡️ Optional: Query parameter untuk reset cache KV Redis
    const { searchParams } = new URL(req.url);
    const isReset = searchParams.get('reset') === 'true';

    const redisKey = `ai_replied:${CH_EXHI}`;

    if (isReset) {
      await kv.del(redisKey);
      return NextResponse.json({ success: true, message: 'Cache Redis berhasil di-reset!' });
    }

    if (!CH_EXHI) {
      return NextResponse.json({ error: 'CH_EXHI belum diset di config' }, { status: 400 });
    }

    // 1. Fetch 8 PESAN TERAKHIR untuk Konteks Percakapan (Biar Nyambung)
    const rawMessages = await discordAPI(`/channels/${CH_EXHI}/messages?limit=8`, 'GET');

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pesan di channel' });
    }

    // Discord mengembalikan array dari pesan terbaru ke lama, kita urutkan balik (kronologis)
    const conversation = [...rawMessages].reverse();
    const lastMsg = rawMessages[0]; // Pesan paling baru

    // 🛑 Rule 1: Skip jika pesan terakhir dari BOT
    if (lastMsg.author?.bot) {
      return NextResponse.json({ message: 'Pesan terakhir dikirim oleh Bot, di-skip.' });
    }

    // 🛑 Rule 2: Skip jika teks kosong
    if (!lastMsg.content || lastMsg.content.trim() === '') {
      return NextResponse.json({ message: 'Pesan berupa media/stiker, di-skip.' });
    }

    // 🛑 Rule 3: Anti-Spam Redis (Kecuali pas dipaksa reset)
    const lastRepliedMsgId = await kv.get<string>(redisKey);
    if (lastRepliedMsgId === lastMsg.id) {
      return NextResponse.json({ message: 'Pesan ini sudah dibalas sebelumnya.' });
    }

    // 🧠 2. Rakit Histori Chat untuk Gemini AI
    const formattedHistory = conversation.map((msg) => {
      const role = msg.author?.bot ? 'Bot' : msg.author?.username || 'User';
      return `${role}: ${msg.content}`;
    }).join('\n');

    const promptText = `Berikut adalah riwayat percakapan terbaru di chat room:\n${formattedHistory}\n\n` +
      `Tolong berikan balasan singkat untuk pesan TERAKHIR dari ${lastMsg.author?.username}: "${lastMsg.content}"`;

    // 🤖 3. Generate Balasan Gemini
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
        temperature: 0.9, // Naikkan dikit biar lebih kreatif/random & gak kaku
      },
    });

    const aiReplyText = response.text?.trim();

    if (!aiReplyText) {
      return NextResponse.json({ error: 'Gemini AI tidak menghasilkan jawaban' }, { status: 500 });
    }

    // 💬 4. Kirim Reply Tepat Menempel ke Pesan Terakhir
    await discordAPI(`/channels/${CH_EXHI}/messages`, 'POST', {
      content: aiReplyText,
      message_reference: {
        message_id: lastMsg.id, // Menempelkan fitur reply seperti screenshot
      },
      allowed_mentions: {
        replied_user: false // Set true kalau mau ngemention orangnya, false kalau enggak
      }
    });

    // 💾 5. Simpan ke Redis
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
