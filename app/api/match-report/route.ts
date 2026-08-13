import { NextResponse, NextRequest } from "next/server";
import { DISCORD_CONFIG } from "@/lib/discord/config"; // <-- Import objek DISCORD_CONFIG

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { reports, channelId: customChannelId } = data;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada data match report yang dikirim!" },
        { status: 400 }
      );
    }

    // Ambil CH_REPORT langsung dari objek DISCORD_CONFIG
    const targetChannelId = customChannelId || DISCORD_CONFIG.CH_REPORT;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || !targetChannelId) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi Discord Bot / CH_REPORT belum disetting." },
        { status: 500 }
      );
    }

    const results = [];

    for (const report of reports) {
      const payload = {
        embeds: [
          {
            title: `${report.group.toUpperCase()} — WEEK ${report.week}`,
            color: 0x3b82f6,
            description: `⚔️ **Match Report #${report.matchNumber}**\n${report.teamA.emoji} **${report.teamA.name}**  VS  ${report.teamB.emoji} **${report.teamB.name}**\n\n📝 **Catatan Match:**\n${report.notes || "_Tidak ada catatan._"}`,
            image: {
              url: report.maskedImageUrl || report.imageUrl,
            },
            footer: {
              text: `TWI Season 7 • ${report.formattedDate}`,
            },
          },
        ],
      };

      const res = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resData = await res.json();
        results.push({ matchId: report.matchId, success: true, messageId: resData.id });
      } else {
        const errorData = await res.json();
        results.push({ matchId: report.matchId, success: false, error: errorData });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Match Report API Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}