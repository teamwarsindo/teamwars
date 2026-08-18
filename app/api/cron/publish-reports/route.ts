import { NextResponse, NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { DISCORD_CONFIG } from "@/lib/discord/config";
import { discordAPI } from "@/lib/discord/utils";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { formatDateTimeWIB } from "@/app/tournament/_library/utils";

export const dynamic = "force-dynamic";

function getMatchIndexNumber(match: MatchScheduleItem, defaultIdx: number): number {
  const parsed = parseInt(String(match.id || "").replace(/[^0-9]/g, ""), 10);
  return !isNaN(parsed) ? parsed : defaultIdx + 1;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetMatchId = searchParams.get("matchId");
    const targetMatchNumber = searchParams.get("matchNumber");

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

    const schedules = (await kv.get<MatchScheduleItem[]>("twi:schedules")) || [];
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ message: "Data jadwal pertandingan kosong di KV." });
    }

    let targetMatch: MatchScheduleItem | null = null;
    let targetIndex = -1;

    if (targetMatchId || targetMatchNumber) {
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
      const pendingItems = schedules
        .map((m, originalIndex) => ({
          ...m,
          _originalIndex: originalIndex,
          _matchNum: getMatchIndexNumber(m, originalIndex),
        }))
        .filter((m) => {
          return (
            m.isFinished === true &&
            m.isCompleted === true &&
            Boolean(m.reportImageUrl) &&
            m.discordSynced !== true
          );
        });

      if (pendingItems.length === 0) {
        return NextResponse.json({
          status: "idle",
          message: "Semua antrean match report yang selesai sudah selesai diposting ke Discord.",
        });
      }

      pendingItems.sort((a, b) => a._matchNum - b._matchNum);

      const selectedItem = pendingItems[0];
      targetIndex = selectedItem._originalIndex;
      targetMatch = schedules[targetIndex];
    }

    const matchNumber = getMatchIndexNumber(targetMatch, targetIndex);

    const getSlug = (str: string) =>
      str ? str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") : "";

    const slugA = getSlug(targetMatch.teamAName);
    const slugB = getSlug(targetMatch.teamBName);

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

    // Format tanggal footer WIB (contoh: "18 Aug 2026 at 20.00 WIB")
    const formattedDate = formatDateTimeWIB(new Date());

    // Anti-cache Discord dengan membersihkan query string lama & memasang timestamp baru
    const rawUrl = targetMatch.maskedImageUrl || targetMatch.reportImageUrl;
    const cleanBaseUrl = rawUrl ? rawUrl.split("?")[0] : undefined;
    const freshUrl = cleanBaseUrl ? `${cleanBaseUrl}?t=${Date.now()}` : undefined;

    const displayGroupName = targetMatch.groupName || "GROUP STAGE";

    const payload = {
      embeds: [
        {
          title: `${displayGroupName.toUpperCase()} — WEEK ${targetMatch.weekNumber || 1}`,
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
