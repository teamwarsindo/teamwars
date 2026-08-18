import { NextResponse, NextRequest } from "next/server";
import { DISCORD_CONFIG } from "@/lib/discord/config";
import { discordAPI } from "@/lib/discord/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sourceChannelId = DISCORD_CONFIG.CH_REPORT;
    const targetChannelId = DISCORD_CONFIG.CH_LOG || "1525775643168735344";
    const messageId = "1539260135631757423";

    if (!sourceChannelId || !targetChannelId) {
      return NextResponse.json(
        { error: "CH_REPORT atau CH_LOG belum terdefinisi di DISCORD_CONFIG" },
        { status: 500 }
      );
    }

    // Payload native Discord Forward (type: 1 = FORWARD)
    const payload = {
      message_reference: {
        type: 1, // 🟢 Tipe 1 menandakan aksi FORWARD, bukan REPLY
        channel_id: sourceChannelId,
        message_id: messageId,
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
        message: `Pesan ${messageId} berhasil di-forward ke channel log`,
        forwardedMessageId: forwardRes.id,
      });
    }

    return NextResponse.json(
      { success: false, error: "Gagal memproses forward ke Discord API" },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
