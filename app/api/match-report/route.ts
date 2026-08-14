import { NextResponse, NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { DISCORD_CONFIG } from "@/lib/discord/config";

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
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken || !targetChannelId) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi Discord Bot / CH_REPORT belum disetting." },
        { status: 500 }
      );
    }

    const schedules = (await kv.get<any[]>("twi:schedules")) || [];
    let isSchedulesUpdated = false;
    const results = [];

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).replace(":", ".") +
      " WIB";

    for (const report of reports) {
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

      const rawImageUrl = report.maskedImageUrl || report.imageUrl;
      const forceFreshImageUrl = rawImageUrl
        ? `${rawImageUrl.split("?")[0]}?v=${Date.now()}`
        : undefined;

      const payload = {
        embeds: [
          {
            title: `${report.group.toUpperCase()} — WEEK ${report.week}`,
            color: 0x3b82f6,
            description: `⚔️ **Match Report #${report.matchNumber}**\n${titleA}  VS  ${titleB}\n\n📝 **Catatan Match:**\n${report.notes || "_Tidak ada catatan._"}`,
            image: forceFreshImageUrl ? { url: forceFreshImageUrl } : undefined,
            footer: {
              text: `TWI Season 7 • ${report.formattedDate || formattedDate}`,
            },
          },
        ],
      };

      const scheduleIdx = schedules.findIndex(
        (s) => (s.id || `match-${s.matchNumber}`) === report.matchId
      );
      const existingMessageId = scheduleIdx !== -1 ? schedules[scheduleIdx].discordMessageId : null;

      let res;

      if (existingMessageId) {
        // PATCH / EDIT PESAN DISCORD LAMA
        res = await fetch(
          `https://discord.com/api/v10/channels/${targetChannelId}/messages/${existingMessageId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // POST PESAN BARU
        res = await fetch(
          `https://discord.com/api/v10/channels/${targetChannelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      if (res.ok) {
        const resData = await res.json();
        results.push({ matchId: report.matchId, success: true, messageId: resData.id });

        if (scheduleIdx !== -1) {
          if (!existingMessageId && resData.id) {
            schedules[scheduleIdx].discordMessageId = resData.id;
          }
          // 🟢 SIMPAN GAMBAR & CATATAN PERMANEN KE KV
          schedules[scheduleIdx].reportImageUrl = report.imageUrl;
          schedules[scheduleIdx].reportNotes = report.notes;
          isSchedulesUpdated = true;
        }
      } else {
        const errorData = await res.json();
        results.push({ matchId: report.matchId, success: false, error: errorData });
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