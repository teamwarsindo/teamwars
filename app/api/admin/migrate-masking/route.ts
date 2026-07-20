import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    
    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ message: "Tidak ada tim di database." });
    }

    let updatedCount = 0;
    const updatedTeams: string[] = [];

    // Lakukan iterasi ke semua tim
    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData) continue;

      let hasChanges = false;
      const updates: any = {};

      // 1. Cek dan Masking Logo
      // Pastikan hanya memigrasi URL yang masih berasal dari Cloudinary
      if (teamData.logoTim && teamData.logoTim.includes('res.cloudinary.com')) {
        try {
          const fileName = new URL(teamData.logoTim).pathname.split('/').pop();
          updates.logoTim = `https://teamwars.web.id/logo/${fileName}`;
          hasChanges = true;
        } catch (e) {
          console.warn(`Gagal parse URL logo untuk ${teamData.namaTim}`);
        }
      }

      // 2. Cek dan Masking Bukti Transfer
      if (teamData.buktiTransfer && teamData.buktiTransfer.includes('res.cloudinary.com')) {
        try {
          const fileName = new URL(teamData.buktiTransfer).pathname.split('/').pop();
          updates.buktiTransfer = `https://teamwars.web.id/bukti/${fileName}`;
          hasChanges = true;
        } catch (e) {
          console.warn(`Gagal parse URL bukti untuk ${teamData.namaTim}`);
        }
      }

      // 3. Jika ada perubahan, simpan ke Database
      if (hasChanges) {
        await kv.hset(`teams:${slug}`, updates);
        updatedCount++;
        updatedTeams.push(teamData.namaTim);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `✅ Berhasil memigrasi aset untuk ${updatedCount} tim!`,
      updatedTeams
    });

  } catch (error) {
    console.error("Masking Migration Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memigrasi data." }, { status: 500 });
  }
      }
