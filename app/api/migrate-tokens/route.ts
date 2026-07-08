import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // 1. Ambil semua slug tim yang sudah terdaftar
    const teams = await kv.smembers("global:teams");
    let resultList = [];

    for (const slug of teams) {
      // 2. Tarik data lengkap masing-masing tim
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      
      if (teamData) {
        let currentToken = teamData.editToken;

        // 3. Jika tim belum punya token (Tim Lama), buatkan sekarang!
        if (!currentToken) {
          currentToken = crypto.randomUUID();
          
          // Simpan token ke dalam data tim
          await kv.hset(`teams:${slug}`, { editToken: currentToken });
          
          // Buat mapping token -> slug agar API edit bisa membacanya
          await kv.set(`token:map:${currentToken}`, slug);
        }

        // 4. Masukkan ke daftar hasil
        resultList.push({
          tim: teamData.namaTim,
          kapten: teamData.email,
          link_edit: `https://teamwars.web.id/edit-team/${currentToken}`
        });
      }
    }

    // Tampilkan hasilnya di layar
    return NextResponse.json({
      message: "Migrasi Token Sukses!",
      total_tim: resultList.length,
      data: resultList
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
          }
