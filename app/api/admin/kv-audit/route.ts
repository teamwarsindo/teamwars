import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';

async function isAuthorizedAdmin() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin_session')?.value;
  return Boolean(adminCookie);
}

// 🟢 GET: Ambil semua Key, Tipe, dan Isinya secara Universal
export async function GET() {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let keys: string[] = [];
    try {
      keys = await kv.keys('*');
    } catch {
      keys = [];
    }

    // Ambil detail tipe dan value tiap key secara paralel
    const items = await Promise.all(
      keys.map(async (key) => {
        const type = await kv.type(key);
        let value: any = null;

        if (type === 'string') {
          value = await kv.get(key);
        } else if (type === 'hash') {
          value = await kv.hgetall(key);
        } else if (type === 'list') {
          value = await kv.lrange(key, 0, -1);
        } else if (type === 'set') {
          value = await kv.smembers(key);
        } else if (type === 'zset') {
          value = await kv.zrange(key, 0, -1, { withScores: true });
        } else {
          value = await kv.get(key);
        }

        return { key, type, value };
      })
    );

    return NextResponse.json({ success: true, items });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 🔵 POST: Tambah Key Baru / Simpan Perubahan Key yang Diedit
export async function POST(req: Request) {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key, type, value } = await req.json();
    if (!key) return NextResponse.json({ error: 'Key wajib diisi' }, { status: 400 });

    let parsedValue = value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }

    if (type === 'hash' && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      await kv.del(key);
      await kv.hset(key, parsedValue);
    } else {
      // String, Array, atau Objek generik
      await kv.set(key, parsedValue);
    }

    return NextResponse.json({ success: true, message: `Key "${key}" berhasil disimpan` });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 🔴 DELETE: Hapus Key Tertentu
export async function DELETE(req: Request) {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key } = await req.json();
    if (!key) return NextResponse.json({ error: 'Key wajib diisi' }, { status: 400 });

    await kv.del(key);
    return NextResponse.json({ success: true, message: `Key "${key}" berhasil dihapus` });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}