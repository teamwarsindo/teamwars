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

export async function GET() {
  try {
    const playoffData = await kv.get(KV_KEY_PLAYOFF_TEAMS);
    return NextResponse.json({ success: true, playoffData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
    const masterTeams = [
      ...(rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_A })),
      ...(rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: DIVISION_MAP.GROUP_B })),
    ];

    // 🟢 Action gabungan dari tombol Admin TournamentView
    if (action === "LOCK_AND_GENERATE") {
      if (!schedules.length || !masterTeams.length) {
        return NextResponse.json({ error: "Data jadwal atau tim belum lengkap" }, { status: 400 });
      }

      // 1. Kunci tim dari hash teams:<slug> & simpan ke KV_KEY_PLAYOFF_TEAMS
      const lockedData = await lockPlayoffTeamsFromStandings(schedules, masterTeams);

      // 2. Buat 11 match playoff baru (Hari Play-Ins diacak Kamis - Minggu)
      const newPlayoffSchedules = generatePlayoffSchedules(
        lockedData.directQuarterFinals,
        lockedData.wildcardSeeds
      );

      // 3. Bersihkan SEMUA match-po DAN semua jadwal grup lama yang ada di Week >= 8
      const regularSchedules = schedules.filter(
        (m: any) => !m.id.startsWith("match-po-") && Number(m.weekNumber || m.week || 1) < 8
      );

      const combinedSchedules = [...regularSchedules, ...newPlayoffSchedules];
      await kv.set(KV_KEY_SCHEDULES, combinedSchedules);

      return NextResponse.json({
        success: true,
        message: "Playoff berhasil dikunci dan 11 jadwal resmi telah dibuat!",
        playoffData: lockedData, // Pastikan key bernama playoffData
        data: lockedData,
        schedules: combinedSchedules,
      });
    }

    if (action === "LOCK_PLAYOFF_TEAMS") {
      const lockedData = await lockPlayoffTeamsFromStandings(schedules, masterTeams);
      return NextResponse.json({ success: true, playoffData: lockedData, data: lockedData });
    }

    if (action === "GENERATE_PLAYOFF_SCHEDULES") {
      const playoffData = await kv.get<any>(KV_KEY_PLAYOFF_TEAMS);
      if (!playoffData?.directQuarterFinals || !playoffData?.wildcardSeeds) {
        return NextResponse.json({ error: "Data playoff belum dikunci" }, { status: 400 });
      }
      const regularSchedules = schedules.filter(
        (m: any) => !m.id.startsWith("match-po-") && Number(m.weekNumber || m.week || 1) < 8
      );
      const newPlayoffSchedules = generatePlayoffSchedules(
        playoffData.directQuarterFinals,
        playoffData.wildcardSeeds
      );
      const combined = [...regularSchedules, ...newPlayoffSchedules];
      await kv.set(KV_KEY_SCHEDULES, combined);
      return NextResponse.json({ success: true, schedules: combined, playoffSchedules: newPlayoffSchedules });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    console.error("Error Playoff Action:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
