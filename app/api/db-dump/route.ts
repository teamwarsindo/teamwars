import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// ⚠️ PERINGATAN: HAPUS FILE INI SETELAH KAMU MENDAPATKAN DATANYA!
export async function GET() {
  try {
    // 1. Ambil semua kunci (keys) yang ada di database
    const keys = await kv.keys("*");

    if (!keys || keys.length === 0) {
      return NextResponse.json({ message: "Database masih kosong", keys: [] });
    }

    const allData: Record<string, any> = {};

    // 2. Looping setiap key dan ambil datanya berdasarkan tipe (String, Hash, List, dll)
    for (const key of keys) {
      const type = await kv.type(key);

      switch (type) {
        case "string":
          allData[key] = await kv.get(key);
          break;
        case "hash":
          allData[key] = await kv.hgetall(key);
          break;
        case "list":
          allData[key] = await kv.lrange(key, 0, -1);
          break;
        case "set":
          allData[key] = await kv.smembers(key);
          break;
        default:
          allData[key] = `[Tipe data tidak didukung oleh script ini: ${type}]`;
      }
    }

    // 3. Tampilkan hasilnya dalam format JSON
    return NextResponse.json({
      total_keys: keys.length,
      data: allData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil data dari KV", details: error.message },
      { status: 500 }
    );
  }
      }
