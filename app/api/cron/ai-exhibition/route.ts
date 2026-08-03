import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ai } from '@/lib/gemini';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Ambil Channel ID Exhibition dari file config
const EXHIBITION_CHANNEL_ID = DISCORD_CONFIG.CH_EXHI;

// Helper pengecekan emoji (Abaikan jika mayoritas emoji/simbol)
function isMajorityEmoji(text: string): boolean {
  if (!text) return true;
  const cleanText = text.replace(/\s+/g, '');
  if (cleanText.length === 0) return true;

  const letterAndNumberMatches = cleanText.match(/[\p{L}\p{N}]/gu) || [];
  const ratio = letterAndNumberMatches.length / cleanText.length;
  return ratio < 0.4;
}

export async function GET(req: Request) {
  try {
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

    // ⚡ 1. PARALLEL FETCH: Ambil pesan Discord + Cek Redis bersamaan
    const [rawMessages, lastRepliedMsgId] = await Promise.all([
      discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages?limit=5`, 'GET'),
      kv.get<string>(redisKey)
    ]);

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pesan di channel exhibition' });
    }

    const lastMsg = rawMessages[0]; // Pesan paling baru

    // 🛑 Rule 1: Skip jika pesan dari Bot
    if (lastMsg.author?.bot) {
      return NextResponse.json({ message: 'Pesan terakhir dikirim oleh Bot, di-skip.' });
    }

    // 🛑 Rule 2: Skip jika teks kosong
    if (!lastMsg.content || lastMsg.content.trim() === '') {
      return NextResponse.json({ message: 'Pesan berupa media/stiker, di-skip.' });
    }

    // 🛑 Rule 3: Skip jika mayoritas emoji
    if (isMajorityEmoji(lastMsg.content)) {
      return NextResponse.json({ message: 'Pesan mayoritas emoji/simbol, di-skip.' });
    }

    // 🛑 Rule 4: Anti-Spam (Sudah pernah dibalas)
    if (lastRepliedMsgId === lastMsg.id) {
      return NextResponse.json({ message: 'Pesan ini sudah dibalas sebelumnya.' });
    }

    // 🧠 2. Rakit Riwayat Chat
    const conversation = [...rawMessages].reverse();
    const formattedHistory = conversation.map((msg) => {
      const role = msg.author?.bot ? 'Bot' : msg.author?.username || 'User';
      return `${role}: ${msg.content}`;
    }).join('\n');

    const promptText = `Riwayat percakapan:\n${formattedHistory}\n\n` +
      `Balas pesan terakhir dari ${lastMsg.author?.username}: "${lastMsg.content}"`;

    // 🔍 TES CEK DAFTAR MODEL YANG AKTIF DULU
    try {
      const listResult = await ai.models.list();
      const availableModels = [];
      for await (const m of listResult) {
        availableModels.push(m.name);
      }
      console.log("🔥 MODEL YANG AKTIF DAN BISA DIPAKAI KEY INI:", availableModels);
    } catch (err) {
      console.error("Gagal fetch list models:", err);
    }
    
    // 🤖 3. Generate Balasan Gemini AI
    // 💡 Format model 'models/gemini-2.5-flash' wajib diawali 'models/' di API v1beta
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: promptText,
      config: {
        systemInstruction:
          'Kamu adalah member Discord biasa di server esports/gaming Indonesia. Santai, rada sarkas, agak pinggir jurang/dark joke khas tongkrongan netizen lokal, cuek, tapi tetep akrab.\n\n' +
          'ATURAN PENTING GAYA BAHASA:\n' +
          '1. JANGAN PERNAH pakai kata "bro", "wkwk" di awal kalimat, "halo", "semangat", atau gaya bahasa CS/Admin AI lebay.\n' +
          '2. Jangan pakai emoji berlebihan (max 1 atau tidak sama sekali).\n' +
          '3. Gunakan bahasa gaul/ketikan anak Discord lokal yang natural dan singkat (max 15 kata).\n' +
          '4. Jika bahas politik/isu lokal, boleh bercanda tipis ala pinggir jurang (sarkas halus).\n' +
          '5. Balas pesan terakhir dengan memperhatikan riwayat chat.',
        temperature: 0.7,
      },
    });

    const aiReplyText = response.text?.trim();

    if (!aiReplyText) {
      return NextResponse.json({ error: 'Gemini AI tidak menghasilkan jawaban' }, { status: 500 });
    }

    // 💬 4. Direct Reply ke Discord + Simpan Redis secara berurutan
    await discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages`, 'POST', {
      content: aiReplyText,
      message_reference: { message_id: lastMsg.id },
      allowed_mentions: { replied_user: false }
    });

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
