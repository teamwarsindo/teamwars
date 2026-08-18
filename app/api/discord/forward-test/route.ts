import { NextResponse, NextRequest } from "next/server";
import { DISCORD_CONFIG } from "@/lib/discord/config";
import { discordAPI } from "@/lib/discord/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sourceChannelId = DISCORD_CONFIG.CH_REPORT;
    const targetChannelId = DISCORD_CONFIG.CH_LOG; // Pastikan CH_LOG sudah ada di config
    const messageId = "1539260135631757423";

    if (!sourceChannelId || !targetChannelId) {
      return NextResponse.json(
        { error: "CH_REPORT atau CH_LOG belum terdefinisi di DISCORD_CONFIG" },
        { status: 500 }
      );
    }

    // 1. Ambil detail pesan asli dari channel sumber
    const originalMessage = await discordAPI(
      `/channels/${sourceChannelId}/messages/${messageId}`,
      "GET"
    );

    if (!originalMessage || !originalMessage.id) {
      return NextResponse.json(
        { error: "Pesan asli tidak ditemukan di channel sumber" },
        { status: 404 }
      );
    }

    // 2. Teruskan pesan ke target channel
    // Discord API mendukung message_reference tipe forward (type: 1) atau replikasi embed
    const payload = {
      content: `📨 **Forwarded Report Log:**`,
      embeds: originalMessage.embeds || [],
      message_reference: {
        message_id: messageId,
        channel_id: sourceChannelId,
        fail_if_not_exists: false,
      },
    };

    const forwardRes = await discordAPI(
      `/channels/${targetChannelId}/messages`,
      "POST",
      payload
    );

    if (forwardRes && forwardRes.id) {
      return NextResponse.json({
        success: true,
        message: `Pesan ${messageId} berhasil diteruskan ke channel log`,
        forwardedMessageId: forwardRes.id,
      });
    }

    return NextResponse.json(
      { success: false, error: "Gagal mengirim forward ke Discord API" },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  }
