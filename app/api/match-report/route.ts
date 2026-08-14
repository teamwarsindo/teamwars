import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_MATCH_REPORT_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

export async function POST(request: Request) {
  try {
    const { reports } = await request.json();

    if (!Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json({ error: "Data report kosong" }, { status: 400 });
    }

    if (!DISCORD_WEBHOOK_URL) {
      return NextResponse.json({ error: "Discord Webhook URL tidak dikonfigurasi di Environment Variable" }, { status: 500 });
    }

    const schedules = (await kv.get<any[]>("twi:schedules")) || [];
    let isSchedulesUpdated = false;

    for (const item of reports) {
      const { matchId, group, week, matchNumber, teamA, teamB, notes, maskedImageUrl } = item;

      // 🟢 FORMAT CUSTOM EMOJI DISCORD: <:kodeTim:emojiId>
      const formatEmoji = (team: any) => {
        if (team.emojiId && team.code) {
          return `<:${team.code}:${team.emojiId}> `;
        }
        if (team.emoji && !["🔵", "🔴"].includes(team.emoji)) {
          return `${team.emoji} `;
        }
        return "";
      };

      const titleA = `${formatEmoji(teamA)}${teamA.name}`;
      const titleB = `${formatEmoji(teamB)}${teamB.name}`;

      // Payload Discord Embed
      const discordPayload = {
        embeds: [
          {
            title: `${group.toUpperCase()} — WEEK ${week}`,
            color: 3883766, // Warna Biru Khas TWI
            fields: [
              {
                name: `⚔️ Match Report #${matchNumber}`,
                value: `**${titleA}** VS **${titleB}**`,
                inline: false,
              },
              {
                name: "📝 Catatan Match",
                value: notes && notes.trim() !== "" ? notes : "_Tidak ada catatan._",
                inline: false,
              },
            ],
            image: maskedImageUrl ? { url: maskedImageUrl } : undefined,
            footer: {
              text: `Team Wars Indonesia • ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`,
            },
          },
        ],
      };

      // Cek apakah match ini di KV sudah punya Message ID di Discord
      const scheduleIdx = schedules.findIndex((s) => (s.id || `match-${s.matchNumber}`) === matchId);
      const existingMsgId = scheduleIdx !== -1 ? schedules[scheduleIdx].discordMessageId : null;

      let resDiscord;

      if (existingMsgId) {
        // 🟢 JIKA SUDAH ADA: PATCH / EDIT PESAN DISCORD LAMA
        resDiscord = await fetch(`${DISCORD_WEBHOOK_URL}/messages/${existingMsgId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload),
        });
      } else {
        // 🟢 JIKA BELUM ADA: POST PESAN BARU (dengan query ?wait=true agar dapat ID)
        const webhookUrlWithWait = DISCORD_WEBHOOK_URL.includes("?") 
          ? `${DISCORD_WEBHOOK_URL}&wait=true` 
          : `${DISCORD_WEBHOOK_URL}?wait=true`;

        resDiscord = await fetch(webhookUrlWithWait, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload),
        });

        if (resDiscord.ok) {
          const sentMsg = await resDiscord.json();
          if (sentMsg?.id && scheduleIdx !== -1) {
            // Simpan Message ID ke Vercel KV
            schedules[scheduleIdx].discordMessageId = sentMsg.id;
            isSchedulesUpdated = true;
          }
        }
      }

      if (!resDiscord.ok) {
        console.error("Gagal mengirim/mengedit ke Discord Webhook", await resDiscord.text());
      }
    }

    // Update Vercel KV jika ada discordMessageId baru yang tersimpan
    if (isSchedulesUpdated) {
      await kv.set("twi:schedules", schedules);
    }

    return NextResponse.json({ success: true, message: "Match report berhasil diproses ke Discord" });
  } catch (error: any) {
    console.error("Error API Match Report:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}