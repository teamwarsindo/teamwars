import { NextResponse, NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { DISCORD_CONFIG } from "@/lib/discord/config";
import { discordAPI } from "@/lib/discord/utils";
import { MatchScheduleItem } from "@/app/tournament/_library/types";
import { formatFullWIB } from "@/app/tournament/_library/utils"; // 🟢 Import fungsi utilitas Anda

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
    if (!targetChannelId) return NextResponse.json({ error: "Config error" }, { status: 500 });

    const schedules = (await kv.get<MatchScheduleItem[]>("twi:schedules")) || [];
    let targetMatch: MatchScheduleItem | null = null;
    let targetIndex = -1;

    if (targetMatchId || targetMatchNumber) {
      targetIndex = schedules.findIndex((m, idx) => {
        const currentId = m.id || `match-${idx + 1}`;
        const currentNum = String(getMatchIndexNumber(m, idx));
        return (targetMatchId && currentId.toLowerCase() === targetMatchId.toLowerCase()) || (targetMatchNumber && currentNum === targetMatchNumber);
      });
      if (targetIndex !== -1) targetMatch = schedules[targetIndex];
    } else {
      const pendingItems = schedules
        .map((m, idx) => ({ ...m, _idx: idx }))
        .filter((m) => m.isFinished === true && m.isCompleted === true && Boolean(m.reportImageUrl) && m.discordSynced !== true);
      
      if (pendingItems.length > 0) {
        pendingItems.sort((a, b) => getMatchIndexNumber(a, 0) - getMatchIndexNumber(b, 0));
        targetIndex = pendingItems[0]._idx;
        targetMatch = schedules[targetIndex];
      }
    }

    if (!targetMatch) return NextResponse.json({ status: "idle", message: "Tidak ada antrean baru." });

    // 🟢 FORCE CACHE REFRESH: Menggunakan timestamp agar Discord fetch ulang gambar
    const rawUrl = targetMatch.maskedImageUrl || targetMatch.reportImageUrl;
    const cleanBaseUrl = rawUrl ? rawUrl.split("?")[0] : undefined;
    const freshUrl = cleanBaseUrl ? `${cleanBaseUrl}?t=${Date.now()}` : undefined;

    const getSlug = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, "-") : "";
    const [teamDataA, teamDataB] = await Promise.all([
      kv.hgetall<Record<string, any>>(`teams:${getSlug(targetMatch.teamAName)}`),
      kv.hgetall<Record<string, any>>(`teams:${getSlug(targetMatch.teamBName)}`),
    ]);

    const formatBadge = (d: any, n: string) => d?.emojiId && d?.kodeTim ? `<:${d.kodeTim}:${d.emojiId}> **${n}**` : `**${n}**`;
    
    // 🟢 MENGGUNAKAN FUNGSI FORMAT TANGGAL RESMI ANDA
    const formattedDate = formatFullWIB(new Date());

    const payload = {
      embeds: [{
        title: `${(targetMatch.groupName || "GROUP STAGE").toUpperCase()} — WEEK ${targetMatch.weekNumber || 1}`,
        color: 0x3b82f6,
        description: `${formatBadge(teamDataA, targetMatch.teamAName)}  VS  ${formatBadge(teamDataB, targetMatch.teamBName)}\n\n📝 **Catatan Match:**\n${targetMatch.reportNotes || "_Tidak ada catatan._"}`,
        image: freshUrl ? { url: freshUrl } : undefined,
        footer: { text: `Team Wars Indonesia • ${formattedDate}` },
      }],
    };

    const resData = await discordAPI(
      targetMatch.discordMessageId ? `/channels/${targetChannelId}/messages/${targetMatch.discordMessageId}` : `/channels/${targetChannelId}/messages`,
      targetMatch.discordMessageId ? "PATCH" : "POST",
      payload
    );

    if (resData) {
      targetMatch.discordMessageId = resData.id || targetMatch.discordMessageId;
      targetMatch.discordSynced = true;
      schedules[targetIndex] = targetMatch;
      await kv.set("twi:schedules", schedules);
      return NextResponse.json({ success: true, action: targetMatch.discordMessageId ? "PATCH" : "POST" });
    }
    return NextResponse.json({ success: false }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
