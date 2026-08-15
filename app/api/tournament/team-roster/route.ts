import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get("teamName");
    const teamId = searchParams.get("teamId");

    if (!teamName && !teamId) {
      return NextResponse.json(
        { success: false, error: "teamName atau teamId wajib disertakan" },
        { status: 400 }
      );
    }

    const query = (teamName || teamId || "").trim();
    const teamSlug = query
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    // 1. Coba ambil langsung dari KV
    let teamData: any = await kv.hgetall(`teams:${teamSlug}`);

    // 2. Jika slug persis tidak ditemukan, cari di daftar global:teams
    if (!teamData) {
      const allSlugs: string[] = (await kv.smembers("global:teams")) || [];
      const matchedSlug = allSlugs.find(
        (s) => s.includes(teamSlug) || teamSlug.includes(s)
      );

      if (matchedSlug) {
        teamData = await kv.hgetall(`teams:${matchedSlug}`);
      }
    }

    if (!teamData) {
      return NextResponse.json(
        { success: false, error: "Tim tidak ditemukan di database" },
        { status: 404 }
      );
    }

    // Parsing data pemain dari stringified JSON
    let players = [];
    if (typeof teamData.players === "string") {
      try {
        players = JSON.parse(teamData.players);
      } catch (e) {
        players = [];
      }
    } else if (Array.isArray(teamData.players)) {
      players = teamData.players;
    }

    const ketua = players.find((p: any) => p.role === "Ketua") || null;
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || null;

    return NextResponse.json({
      success: true,
      data: {
        namaTim: teamData.namaTim || query,
        warna: teamData.warna || "#3b82f6",
        logoTim: teamData.logoTim || "/logo.webp",
        ketua,
        wakil,
        players,
      },
    });
  } catch (error: unknown) {
    console.error("Team Roster API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data roster" },
      { status: 500 }
    );
  }
                               }
