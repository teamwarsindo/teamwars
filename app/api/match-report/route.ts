import { NextResponse, NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { DISCORD_CONFIG } from "@/lib/discord/config";
import { discordAPI } from "@/lib/discord/utils";

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

    const targetChannelId = customChannelId || DISCORD_CONFIG.CH_REPORT;

    if (!targetChannelId) {
      return NextResponse.json(
        { success: false, error: "CH_REPORT belum disetting di discord config." },
        { status: 500 }
      );
    }

    const schedules = (await kv.get<any[]>("twi:schedules")) || [];
    let isSchedulesUpdated = false;
    const results = [];

    // Format Tanggal Konsisten dengan lib/discord/utils
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const formattedDate = `${dateStr} at ${timeStr} WIB`;

    for (const report of reports) {
      // 🟢 Formatter Custom Emoji Discord (<:kodeTim:emojiId>)
      const renderTeamBadge = (team: any) => {
        if (team?.emojiId && team?.code) {
          return `<:${team.code}:${team.emojiId}>`;
        }
        return team?.emoji || "";
      };

      const teamABadge = renderTeamBadge(report.teamA);
      const teamBBadge = renderTeamBadge(report.teamB);

      const titleA = `${teamABadge} **${report.teamA.name}**`.trim();
      const titleB = `${teamBBadge} **${report.teamB.name}**`.trim();

      // Buster Cache Discord
      const rawImageUrl = report.maskedImageUrl || report.imageUrl;
      const forceFreshImageUrl = rawImageUrl
        ? `${rawImageUrl.split("?")[0]}?v=${Date.now()}`
        : undefined;

      const payload = {
        embeds: [
          {
            title: `${report.group.toUpperCase()} — WEEK ${report.week}`,
            color: 0x3b82f6,
            description: `${titleA}  VS  ${titleB}\n\n📝 **Catatan Match:**\n${report.notes || "_Tidak ada catatan._"}`,
            image: forceFreshImageUrl ? { url: forceFreshImageUrl } : undefined,
            footer: {
              text: `Team Wars Indonesia • ${report.formattedDate || formattedDate}`,
            },
          },
        ],
      };

      // Cek apakah match ini sudah punya ID pesan di KV
      const scheduleIdx = schedules.findIndex(
        (s) => (s.id || `match-${s.matchNumber}`) === report.matchId
      );
      const existingMessageId = scheduleIdx !== -1 ? schedules[scheduleIdx].discordMessageId : null;

      let resData;

      if (existingMessageId) {
        // 🟢 EDIT PESAN LAMA MENGGUNAKAN discordAPI
        resData = await discordAPI(
          `/channels/${targetChannelId}/messages/${existingMessageId}`,
          "PATCH",
          payload
        );
      } else {
        // 🟢 KIRIM PESAN BARU MENGGUNAKAN discordAPI
        resData = await discordAPI(
          `/channels/${targetChannelId}/messages`,
          "POST",
          payload
        );
      }

      if (resData && (resData.id || resData === true)) {
        const msgId = resData.id || existingMessageId;
        results.push({ matchId: report.matchId, success: true, messageId: msgId });

        if (scheduleIdx !== -1) {
          if (!existingMessageId && resData.id) {
            schedules[scheduleIdx].discordMessageId = resData.id;
          }
          schedules[scheduleIdx].reportImageUrl = report.imageUrl;
          schedules[scheduleIdx].reportNotes = report.notes;
          isSchedulesUpdated = true;
        }
      } else {
        results.push({ matchId: report.matchId, success: false, error: "Gagal memproses ke Discord API" });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (isSchedulesUpdated) {
      await kv.set("twi:schedules", schedules);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Match Report API Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}