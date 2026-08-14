import { NextResponse, NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { DISCORD_CONFIG } from "@/lib/discord/config";
import { discordAPI } from "@/lib/discord/utils";

export const dynamic = "force-dynamic";

// Helper ekstraksi nomor urut integer dari id (contoh: "match-2" -> 2)
function getMatchIndexNumber(match: any, defaultIdx: number): number {
  if (typeof match.matchNumber === "number" && !isNaN(match.matchNumber)) {
    return match.matchNumber;
  }
  const parsed = parseInt(String(match.id || "").replace(/[^0-9]/g, ""), 10);
  return !isNaN(parsed) ? parsed : defaultIdx + 1;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetMatchId = searchParams.get("matchId");
    const targetMatchNumber = searchParams.get("matchNumber");

    // 🔒 Proteksi Token Opsional (jika CRON_SECRET diset di env)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetChannelId = DISCORD_CONFIG.CH_REPORT;
    if (!targetChannelId) {
      return NextResponse.json(
        { error: "CH_REPORT belum diatur di lib/discord/config.ts" },
        { status: 500 }
      );
    }

    const schedules = (await kv.get<any[]>("twi:schedules")) || [];
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ message: "Data jadwal pertandingan kosong di KV." });
    }

    let targetMatch: any = null;
    let targetIndex = -1;

    if (targetMatchId || targetMatchNumber) {
      // 🟢 MODE 1: MANUAL PATCH SPESIFIK MATCH (Contoh: "match-2" atau 2)
      targetIndex = schedules.findIndex((m, idx) => {
        const currentId = m.id || `match-${idx + 1}`;
        const currentNum = String(getMatchIndexNumber(m, idx));
        return (
          (targetMatchId && currentId.toLowerCase() === targetMatchId.toLowerCase()) ||
          (targetMatchNumber && currentNum === targetMatchNumber)
        );
      });

      if (targetIndex === -1) {
        return NextResponse.json(
          { error: `Match ${targetMatchId || targetMatchNumber} tidak ditemukan di database KV` },
          { status: 404 }
        );
      }

      targetMatch = schedules[targetIndex];

      if (!targetMatch.reportImageUrl) {
        return NextResponse.json(
          { error: `Match #${getMatchIndexNumber(targetMatch, targetIndex)} belum memiliki report image tersimpan di KV` },
          { status: 400 }
        );
      }
    } else {
      // 🟢 MODE 2: CRON OTOMATIS BERURUTAN (1 per 1 dari match id terkecil)
      const pendingItems = schedules
        .map((m, originalIndex) => ({
          ...m,
          _originalIndex: originalIndex,
          _matchNum: getMatchIndexNumber(m, originalIndex),
        }))
        .filter((m) => m.isReadyToPublish === true && m.discordSynced !== true && m.reportImageUrl);

      if (pendingItems.length === 0) {
        return NextResponse.json({
          status: "idle",
          message: "Semua antrean match report sudah selesai diposting ke Discord.",
        });
      }

      // Urutkan dari Match terkecil (match-1, match-2, ...)
      pendingItems.sort((a, b) => a._matchNum - b._matchNum);

      const selectedItem = pendingItems[0];
      targetIndex = selectedItem._originalIndex;
      targetMatch = schedules[targetIndex];
    }

    const matchNumber = getMatchIndexNumber(targetMatch, targetIndex);

    // Helper Slug
    const getSlug = (str: string) =>
      str ? str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") : "";

    const slugA = targetMatch.teamASlug || getSlug(targetMatch.teamAName);
    const slugB = targetMatch.teamBSlug || getSlug(targetMatch.teamBName);

    // Tarik Kode Tim & Emoji Id dari KV Hash
    const [teamDataA, teamDataB] = await Promise.all([
      slugA ? kv.hgetall<Record<string, any>>(`teams:${slugA}`) : null,
      slugB ? kv.hgetall<Record<string, any>>(`teams:${slugB}`) : null,
    ]);

    const formatBadge = (teamData: any, teamName: string) => {
      const code = teamData?.kodeTim || teamData?.code;
      if (teamData?.emojiId && code) {
        return `<:${code}:${teamData.emojiId}> **${teamName}**`;
      }
      return `**${teamName}**`;
    };

    const titleA = formatBadge(teamDataA, targetMatch.teamAName);
    const titleB = formatBadge(teamDataB, targetMatch.teamBName);

    // Format Tanggal Footer
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

    const rawUrl = targetMatch.maskedImageUrl || targetMatch.reportImageUrl;
    const freshUrl = rawUrl ? `${rawUrl.split("?")[0]}?v=${Date.now()}` : undefined;

    const payload = {
      embeds: [
        {
          title: `${(targetMatch.groupName || "GROUP").toUpperCase()} — WEEK ${targetMatch.weekNumber || 1}`,
          color: 0x3b82f6,
          description: `${titleA}  VS  ${titleB}\n\n📝 **Catatan Match:**\n${targetMatch.reportNotes || "_Tidak ada catatan._"}`,
          image: freshUrl ? { url: freshUrl } : undefined,
          footer: {
            text: `Team Wars Indonesia • ${formattedDate}`,
          },
        },
      ],
    };

    let resData;
    let actionType = "POST";

    if (targetMatch.discordMessageId) {
      actionType = "PATCH";
      resData = await discordAPI(
        `/channels/${targetChannelId}/messages/${targetMatch.discordMessageId}`,
        "PATCH",
        payload
      );
    } else {
      actionType = "POST";
      resData = await discordAPI(
        `/channels/${targetChannelId}/messages`,
        "POST",
        payload
      );
    }

    if (resData && (resData.id || resData === true)) {
      if (resData.id) {
        targetMatch.discordMessageId = resData.id;
      }
      targetMatch.discordSynced = true;

      schedules[targetIndex] = targetMatch;
      await kv.set("twi:schedules", schedules);

      return NextResponse.json({
        success: true,
        action: actionType,
        matchId: targetMatch.id || `match-${matchNumber}`,
        matchNumber: matchNumber,
        messageId: targetMatch.discordMessageId,
        message: `Match #${matchNumber} (${targetMatch.teamAName} vs ${targetMatch.teamBName}) berhasil di-${actionType} ke Discord.`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Gagal mengirim Match #${matchNumber} ke Discord API` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Cron Dispatcher Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}