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

    // Tarik data jadwal dari KV Redis untuk pengecekan Message ID
    const schedules = (await kv.get<any[]>("twi:schedules")) || [];
    let isSchedulesUpdated = false;
    const results = [];

    for (const report of reports) {
      // 🟢 Formatter Custom Emoji Discord (<:code:emojiId> atau emoji biasa)
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

      // Embed Payload Discord
      const payload = {
        embeds: [
          {
            title: `${report.group.toUpperCase()} — WEEK ${report.week}`,
            color: 0x3b82f6,
            description: `⚔️ **Match Report #${report.matchNumber}**\n${titleA}  VS  ${titleB}\n\n📝 **Catatan Match:**\n${report.notes || "_Tidak ada catatan._"}`,
            image: {
              url: report.maskedImageUrl || report.imageUrl,
            },
            footer: {
              text: `TWI Season 7 • ${report.formattedDate || new Date().toLocaleDateString("id-ID")}`,
            },
          },
        ],
      };

      // Cek apakah match ini sudah pernah dikirim (punya discordMessageId di KV)
      const scheduleIdx = schedules.findIndex(
        (s) => (s.id || `match-${s.matchNumber}`) === report.matchId
      );
      const existingMessageId = scheduleIdx !== -1 ? schedules[scheduleIdx].discordMessageId : null;

      let res;

      if (existingMessageId) {
        // 🟢 EDIT PESAN LAMA (PATCH)
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
        // 🟢 KIRIM PESAN BARU (POST)
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

        // Simpan discordMessageId baru ke KV Redis jika baru dibuat
        if (!existingMessageId && resData.id && scheduleIdx !== -1) {
          schedules[scheduleIdx].discordMessageId = resData.id;
          isSchedulesUpdated = true;
        }
      } else {
        const errorData = await res.json();
        results.push({ matchId: report.matchId, success: false, error: errorData });
      }

      // Delay kecil untuk menghindari rate-limit Discord API
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Simpan pembaruan Message ID ke Vercel KV jika ada pesan baru
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
