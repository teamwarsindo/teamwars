import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import {
  KV_KEY_PLAYOFF_TEAMS,
  lockPlayoffTeamsFromStandings,
  generatePlayoffSchedules,
} from "@/app/tournament/_library/playoff-generator";

const KV_KEY_SCHEDULES = "twi:schedules";
const KV_KEY_ROULETTE = "twi:roulette_state";

// GET: Ambil status data playoff saat ini
export async function GET() {
  try {
    const playoffData = await kv.get(KV_KEY_PLAYOFF_TEAMS);
    return NextResponse.json({ success: true, playoffData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Aksi Lock & Generate
export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
    const masterTeams = [
      ...(rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A })),
      ...(rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B })),
    ];

    if (action === "LOCK_PLAYOFF_TEAMS") {
      const lockedData = await lockPlayoffTeamsFromStandings(schedules, masterTeams);
      return NextResponse.json({
        success: true,
        message: "Tim playoff berhasil dikunci!",
        data: lockedData,
      });
    }

    if (action === "GENERATE_PLAYOFF_SCHEDULES") {
      const playoffData = await kv.get<any>(KV_KEY_PLAYOFF_TEAMS);
      if (!playoffData?.directQuarterFinals || !playoffData?.wildcardSeeds) {
        return NextResponse.json(
          { error: "Data playoff belum dikunci. Jalankan LOCK_PLAYOFF_TEAMS dulu." },
          { status: 400 }
        );
      }

      // Bersihkan playoff schedules lama, lalu gabungkan
      const regularSchedules = schedules.filter((m) => !m.id.startsWith("match-po-"));
      const newPlayoffSchedules = generatePlayoffSchedules(
        playoffData.directQuarterFinals,
        playoffData.wildcardSeeds
      );

      const combined = [...regularSchedules, ...newPlayoffSchedules];
      await kv.set(KV_KEY_SCHEDULES, combined);

      return NextResponse.json({
        success: true,
        message: "Jadwal playoff berhasil di-generate ke schedules!",
        playoffSchedules: newPlayoffSchedules,
      });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
