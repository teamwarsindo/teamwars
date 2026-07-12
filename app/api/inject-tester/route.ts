import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const slug = "tim-tester";
    
    // 1. Daftarkan tim ke list global
    await kv.sadd("global:teams", slug);
    
    // 2. Masukkan data tim (Termasuk ID Role yang lu kasih)
    await kv.hset(`teams:${slug}`, {
      namaTim: "Tim Tester",
      warna: "#4CAF50",
      email: "tester@teamwars.web.id",
      // 🎯 Ini ID Role Lead Data Analyst lu buat testing
      roleId: "1171088356218777651", 
      players: JSON.stringify([
        {
          role: "Ketua",
          namaLengkap: "Achmad Tester",
          ign: "Testing",
          discord: "achmadns20",
          idDuelLinks: "123-456-789"
        }
      ])
    });

    // 3. Masukkan ke global uniqueness (Opsional, biar sekalian rapi)
    await kv.sadd("global:discord", "achmadns20");
    await kv.sadd("global:ign", "testing");

    return NextResponse.json({ 
      success: true, 
      message: "✅ Data Tim Tester berhasil disuntikkan ke Vercel KV!" 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
