import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const keys = await kv.keys("*");

    if (!keys || keys.length === 0) {
      return NextResponse.json({ message: "Database masih kosong", keys: [] });
    }

    const schemaInfo: Record<string, any> = {};

    for (const key of keys) {
      const type = await kv.type(key);

      switch (type) {
        case "string":
          schemaInfo[key] = { type: "string" };
          break;
        case "hash":
          // Hanya ambil nama field (kolom), bukan valuenya
          const fields = await kv.hkeys(key);
          schemaInfo[key] = { type: "hash", columns: fields };
          break;
        case "list":
          // Hanya hitung ada berapa item di dalam list
          const listLen = await kv.llen(key);
          schemaInfo[key] = { type: "list", length: listLen };
          break;
        case "set":
          // Ambil datanya lalu hitung length-nya
          const setMembers = await kv.smembers(key);
          schemaInfo[key] = { type: "set", length: setMembers.length };
          break;
        default:
          schemaInfo[key] = { type };
      }
    }

    return NextResponse.json({
      total_keys: keys.length,
      schema: schemaInfo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil skema database", details: error.message },
      { status: 500 }
    );
  }
            }
