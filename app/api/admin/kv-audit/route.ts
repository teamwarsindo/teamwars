import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, DIVISION_MAP } from '@/lib/types/tournament';

const KV_KEY_SCHEDULES = 'twi:schedules';

// Helper: Cek Otorisasi Admin via Cookie
async function isAuthorizedAdmin() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin_session')?.value;
  return Boolean(adminCookie);
}

// 🟢 GET: Audit Data & Scan Seluruh Key KV
export async function GET() {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    // 1. Ambil Schedules Array
    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    // 2. Scan Seluruh Keys Global di Upstash KV
    let allKeys: string[] = [];
    try {
      allKeys = await kv.keys('*');
    } catch {
      allKeys = [KV_KEY_SCHEDULES];
    }

    // 3. Ambil Detail Meta Seluruh Key
    const keysMeta = await Promise.all(
      allKeys.map(async (key) => {
        const type = await kv.type(key);
        return { key, type };
      })
    );

    // 4. Deteksi Mismatch groupName di Schedules
    const mismatchedSchedules = schedules.filter((m) => {
      const isGroupAOld = m.groupName === 'Group A' || m.groupName === 'GROUP_A';
      const isGroupBOld = m.groupName === 'Group B' || m.groupName === 'GROUP_B';
      return isGroupAOld || isGroupBOld;
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalMatches: schedules.length,
        mismatchedCount: mismatchedSchedules.length,
        totalKeysInKv: allKeys.length,
      },
      schedules,
      keysMeta,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 🔵 POST: Batch Normalisasi/Fix Group Name atau Save Custom Raw Data
export async function POST(req: Request) {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, rawKey, rawValue, updatedSchedules } = body;

    // A. Normalisasi Otomatis Nama Group ("Group A" -> DIVISION_MAP.GROUP_A)
    if (action === 'NORMALIZE_GROUPS') {
      const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
      const fixedSchedules = schedules.map((m) => {
        let normalizedGroup = m.groupName;
        if (m.groupName === 'Group A' || m.groupName === 'GROUP_A') {
          normalizedGroup = DIVISION_MAP.GROUP_A;
        } else if (m.groupName === 'Group B' || m.groupName === 'GROUP_B') {
          normalizedGroup = DIVISION_MAP.GROUP_B;
        }
        return { ...m, groupName: normalizedGroup };
      });

      await kv.set(KV_KEY_SCHEDULES, fixedSchedules);
      return NextResponse.json({
        success: true,
        message: 'Berhasil menormalisasi seluruh nama Group!',
      });
    }

    // B. Simpan Perubahan Array Schedules Hasil Edit Manual
    if (action === 'SAVE_SCHEDULES' && Array.isArray(updatedSchedules)) {
      await kv.set(KV_KEY_SCHEDULES, updatedSchedules);
      return NextResponse.json({
        success: true,
        message: 'Daftar Schedule berhasil diperbarui!',
      });
    }

    // C. Set Custom Value Ke Key Apapun
    if (action === 'SET_RAW_KEY' && rawKey) {
      await kv.set(rawKey, rawValue);
      return NextResponse.json({
        success: true,
        message: `Key "${rawKey}" berhasil diperbarui!`,
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 🟡 PATCH: Hapus Kolom/Property Tertentu Dari Seluruh Object Match
export async function PATCH(req: Request) {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    const { fieldName } = await req.json();
    if (!fieldName) {
      return NextResponse.json({ error: 'Nama kolom/field harus diisi' }, { status: 400 });
    }

    const schedules = (await kv.get<any[]>(KV_KEY_SCHEDULES)) || [];
    const cleanedSchedules = schedules.map((item) => {
      const newItem = { ...item };
      delete newItem[fieldName];
      return newItem;
    });

    await kv.set(KV_KEY_SCHEDULES, cleanedSchedules);

    return NextResponse.json({
      success: true,
      message: `Kolom/Field "${fieldName}" berhasil dihapus dari seluruh data match!`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 🔴 DELETE: Hapus Single Match (Baris) atau Hapus Key KV
export async function DELETE(req: Request) {
  if (!(await isAuthorizedAdmin())) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    const { matchId, kvKey } = await req.json();

    // A. Hapus 1 Baris Match dari Array
    if (matchId) {
      const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
      const filtered = schedules.filter((m) => m.id !== matchId);
      await kv.set(KV_KEY_SCHEDULES, filtered);
      return NextResponse.json({
        success: true,
        message: `Match ID "${matchId}" berhasil dihapus!`,
      });
    }

    // B. Hapus 1 Key KV Global
    if (kvKey) {
      await kv.del(kvKey);
      return NextResponse.json({
        success: true,
        message: `Key KV "${kvKey}" berhasil dihapus dari database!`,
      });
    }

    return NextResponse.json({ error: 'Parameter hapus tidak valid' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}