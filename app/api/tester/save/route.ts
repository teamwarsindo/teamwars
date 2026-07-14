import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { namaTim, warna, players } = data;
    
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah ada di DB!" }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); 
    const editToken = crypto.randomUUID(); 

    // 1. SIMPAN KE BRANKAS UTAMA (Struktur 100% sama dengan produksi)
    await kv.hset(kvKey, {
      namaTim: namaTim.trim(),
      warna: warna,
      email: "tester@teamwars.web.id", // Dummy
      logoTim: "https://dummyimage.com/200x200", // Dummy
      buktiTransfer: "https://dummyimage.com/receipt", // Dummy
      players: JSON.stringify(players), 
      createdAt: timestampNow,
      updatedAt: timestampNow,
      statusVerifikasi: "Pending",
      editToken: editToken,
      // Field discord disiapkan kosong dulu
      discordRoleId: "",
      discordChannelId: "",
      discordVoiceChannelId: ""
    });

    // 2. MAPPING TOKEN & SUMMARY LIST
    await kv.set(`token:map:${editToken}`, teamSlug);

    const rawSummary: any = await kv.get("global:summary_list");
    const summaryList = Array.isArray(rawSummary) ? rawSummary : [];
    summaryList.push({
      namaTim: namaTim.trim(),
      teamSlug: teamSlug,
      statusVerifikasi: "Pending",
      createdAt: timestampNow
    });
    await kv.set("global:summary_list", JSON.stringify(summaryList));

    // 3. INJEKSI INDEX SEKUNDER
    await kv.sadd("global:teams", teamSlug);
    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign?.toLowerCase()).filter(Boolean);
      const discords = players.map((p: any) => p.discord?.toLowerCase()).filter(Boolean);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
    }

    return NextResponse.json({ success: true, message: `✅ Struktur DB ${namaTim} berhasil dibangun persis sistem asli!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // GET Data untuk ditampilkan di table tester (tetap sama)
  try {
    const slugs = await kv.smembers("global:teams");
    const teams = [];
    for (const slug of slugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (teamData) {
        teams.push({
          slug,
          namaTim: teamData.namaTim,
          warna: teamData.warna,
          sudahGenerate: !!teamData.discordRoleId,
          discordRoleId: teamData.discordRoleId
        });
      }
    }
    return NextResponse.json({ success: true, teams });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
