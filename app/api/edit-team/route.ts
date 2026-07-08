import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: NextRequest) {
  // 1. Tangkap parameter ?token= dari URL
  const token = req.nextUrl.searchParams.get("token");
  
  if (!token) {
    return NextResponse.json({ error: "Token akses tidak ditemukan!" }, { status: 400 });
  }

  try {
    // 2. Terjemahkan Token menjadi Slug Tim (Sesuai PDF poin 2)
    const teamSlug = await kv.get(`token:map:${token}`);
    
    if (!teamSlug) {
      return NextResponse.json({ error: "Token tidak valid atau sudah kadaluarsa." }, { status: 404 });
    }

    // 3. Tarik semua data utuh tim tersebut
    const teamData = await kv.hgetall(`teams:${teamSlug}`);
    
    if (!teamData) {
      return NextResponse.json({ error: "Data tim tidak ditemukan di database." }, { status: 404 });
    }

    return NextResponse.json({ success: true, team: teamData }, { status: 200 });
    
  } catch (error: any) {
    console.error("API Edit-Team Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
